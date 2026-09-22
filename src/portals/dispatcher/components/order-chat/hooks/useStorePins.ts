import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../../../services/apiClient";
import { apiService } from "../../../../../services/apiService";
import {
  loadGoogleMapsScript,
  importGoogleMapsLibrary,
  onGoogleMapsStatus,
  type GoogleMapsStatus,
} from "../../../../../utils/loadGoogleMaps";
import { SERVICE_AREA_BOUNDS } from "../../../../../constants/serviceArea";
import { useInlineMessage } from "@/components/panel/DispatcherInlineBanner";
import { metresBetween } from "../../../../../utils/geo";
import { GOOGLE_MAP_ID, canUseAdvancedMarkers } from "../../../../../utils/googleMapId";
import { copy } from "../copy";
import {
  inferCategoryFromGoogleTypes,
  inferCategoryFromCatalogueName,
  findDuplicatePin,
  type DuplicateVerdict,
} from "./storeCategoryInference";
import type {
  StorePinpoint,
  MerchantCategory,
  CategorySource,
  OrderChatMessage,
} from "../types";

export const MAX_PINPOINTS = 3;
const TACURONG_CENTER = { lat: 6.671, lng: 124.6644 };

/** Illegal Firebase RTDB key characters: . # $ / [ ] */
const cleanName = (s: string) => (s || "").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();

/**
 * A Plus Code (Open Location Code) — Google's own fallback "address" for a
 * point with no real street address, e.g. "MMF7+6G8". Grid coordinates spelled
 * with letters, not a name: a dispatcher glancing at a store list has no way to
 * know what it refers to.
 */
const PLUS_CODE_PATTERN = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

/**
 * How close a click must land to a business for that business to count as
 * "this is what was pinned", rather than a nearby but different building.
 */
const ESTABLISHMENT_MATCH_RADIUS_METERS = 30;

/**
 * Turns a reverse-geocode response into a name a dispatcher can actually read.
 *
 * Google orders results most-to-least specific, and for a point with no
 * addressed building nearby — an alley, a market stall, a spot in a parking
 * lot, all common in Tacurong — the MOST specific result is routinely a Plus
 * Code. Taking results[0] unconditionally meant clicking exactly the kind of
 * place that lacks a tidy address was the one case guaranteed to produce a
 * code. Returns null rather than guess, so the caller's honest "Store N"
 * fallback is what a dispatcher sees.
 */
function resolveReadablePlaceName(results: any[] | null | undefined): string | null {
  for (const result of results || []) {
    if (result?.types?.includes("plus_code")) continue;
    // Only the leading segment — a formatted_address can still OPEN with a Plus
    // Code ("MMF7+6G8, Tacurong City") without being one, and that front half is
    // exactly what a dispatcher can't read.
    const candidates = [
      result?.address_components?.[0]?.long_name,
      result?.formatted_address?.split(",")[0],
    ];
    for (const candidate of candidates) {
      const trimmed = candidate?.trim();
      if (trimmed && !PLUS_CODE_PATTERN.test(trimmed)) return trimmed;
    }
  }
  return null;
}

/**
 * The name of the business at a clicked point, if the click landed on one.
 *
 * A plain reverse-geocode answers "what is this address" — for a spot sitting
 * on top of a real store that is routinely a street number, because the
 * geocoder has no idea a business is there. Places is what knows about
 * businesses. Ranked by actual distance from the click, not Places' own
 * relevance ordering, so a well-known chain a little farther off can't win over
 * the exact shop the pin landed on.
 */
function findNearbyEstablishmentName(
  map: any,
  lat: number,
  lng: number,
  callback: (name: string | null) => void
) {
  const places = (window as any).google?.maps?.places;
  if (!places?.PlacesService) {
    callback(null);
    return;
  }
  const service = new places.PlacesService(map);
  service.nearbySearch(
    { location: { lat, lng }, radius: ESTABLISHMENT_MATCH_RADIUS_METERS, type: "establishment" },
    (results: any, status: any) => {
      if (status !== places.PlacesServiceStatus.OK || !results?.length) {
        callback(null);
        return;
      }
      let closest: { name: string; distance: number } | null = null;
      for (const place of results) {
        const loc = place.geometry?.location;
        if (!place.name || !loc) continue;
        const distance = metresBetween({ lat, lng }, { lat: loc.lat(), lng: loc.lng() });
        if (
          distance <= ESTABLISHMENT_MATCH_RADIUS_METERS &&
          (!closest || distance < closest.distance)
        ) {
          closest = { name: place.name, distance };
        }
      }
      callback(closest?.name ?? null);
    }
  );
}

interface UseStorePinsArgs {
  orderId: string;
  orderDetails: any;
  merchantCategories: MerchantCategory[];
  customerDisplayName: string;
  initialPinpoints: StorePinpoint[] | null;
  /**
   * The conversation, read only to find out whether the stores have already
   * been sent. Stage 2 completes on that, and a dispatcher who reloads the
   * page mid-order must not be sent back to re-send stores the customer
   * already has.
   */
  messages: OrderChatMessage[];
  onOrderUpdated: (errand: any) => void;
  pushMessage: (payload: Record<string, any>) => void;
  /** Only mount the map when stage 2 is actually open. */
  mapVisible: boolean;
}

export function useStorePins({
  orderId,
  orderDetails,
  merchantCategories,
  customerDisplayName,
  initialPinpoints,
  messages,
  onOrderUpdated,
  pushMessage,
  mapVisible,
}: UseStorePinsArgs) {
  const [pinpoints, setPinpoints] = useState<StorePinpoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapsStatus, setMapsStatus] = useState<GoogleMapsStatus>("ok");
  /**
   * The map instance lives in a ref, and assigning a ref does not re-render.
   * Without this flag the marker effect below ran once while the map was still
   * null, returned early, and never ran again - so pins loaded from the server
   * were never drawn at all. Only pins added AFTER the map existed appeared,
   * which is why the bug looked intermittent.
   */
  const [mapReady, setMapReady] = useState(false);
  const feedback = useInlineMessage();

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const customerMarkerRef = useRef<any>(null);
  // The map click handler is rebuilt on every pin change; a ref keeps the
  // listener reading current state without re-creating the map.
  const pinsRef = useRef<StorePinpoint[]>([]);
  pinsRef.current = pinpoints;
  const searchInputRef = useRef("");
  searchInputRef.current = searchInput;
  const categoriesRef = useRef<MerchantCategory[]>([]);
  categoriesRef.current = merchantCategories;

  /** True when the map cannot be shown, for whatever reason. */
  const mapUnavailable = mapsStatus !== "ok";

  useEffect(() => {
    if (initialPinpoints && initialPinpoints.length > 0) setPinpoints(initialPinpoints);
  }, [initialPinpoints]);

  // Google tells us the key was refused through a global callback, not a
  // rejected promise — see loadGoogleMaps.ts.
  useEffect(() => onGoogleMapsStatus(setMapsStatus), []);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setScriptLoaded(true))
      .catch((err) => console.warn("Google Maps script load failed:", err));
  }, []);

  const notifyAtLimit = useCallback(() => {
    toast.warning(copy.stage2.atLimit(MAX_PINPOINTS));
  }, []);

  /**
   * A pin the dispatcher has been warned about and must confirm or discard.
   * Held rather than added, so an accidental double-pin never silently reaches
   * the customer's bill.
   */
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    pin: StorePinpoint;
    verdict: Extract<DuplicateVerdict, { kind: "likely" }>;
  } | null>(null);

  /**
   * Fills in a category the local rules could not work out, by asking the
   * category service to read the shop name (see server/ml).
   *
   * Runs AFTER the pin is on screen, never before it. The dispatcher gets their
   * pin at the speed of a click and the category arrives a moment later if it
   * arrives at all — putting this in front of the pin would mean a sidecar
   * having a slow morning is felt as the map being broken.
   *
   * Only ever fills a category that is MISSING. It cannot overwrite a catalogue
   * match, a Google type or anything the dispatcher chose: those are all better
   * evidence than reading a name, and a guess that quietly replaces a known
   * answer is the one failure mode that would make this worse than nothing.
   */
  const enrichCategory = useCallback(async (pin: StorePinpoint) => {
    if (pin.categoryId != null) return;

    const guess = await apiService.inferStoreCategory(pin.storeName, pin.googleTypes);
    if (!guess.available || guess.categoryId == null) return;

    setPinpoints((prev) =>
      prev.map((p) =>
        // Matched on identity rather than index: a dispatcher can remove a pin
        // while this request is in flight, and patching by position would then
        // categorise a different shop.
        p.categoryId == null &&
        p.storeName === pin.storeName &&
        p.latitude === pin.latitude &&
        p.longitude === pin.longitude
          ? {
              ...p,
              categoryId: guess.categoryId!,
              categorySource: "model" as CategorySource,
              categoryConfidence: guess.confidence,
              categoryRunnerUp: guess.alternatives?.[0]?.categoryName,
            }
          : p
      )
    );
  }, []);

  /** Adds without asking. Only for a pin the dispatcher has already confirmed. */
  const forceAddPin = useCallback(
    (pin: StorePinpoint): boolean => {
      let added = false;
      setPinpoints((prev) => {
        if (prev.length >= MAX_PINPOINTS) {
          notifyAtLimit();
          return prev;
        }
        added = true;
        return [...prev, pin];
      });
      // The single funnel every pin passes through, so the search result, the
      // map click and the "pin it anyway" override all get the same treatment.
      if (added) void enrichCategory(pin);
      return added;
    },
    [notifyAtLimit, enrichCategory]
  );

  /**
   * The single gate every pin passes through.
   *
   * Duplicates are not merely untidy. The server prices a "store" as
   * `pinpoints.length`, so a second pin on a shop already pinned adds a
   * multi-store fee to a quote the customer has already agreed to. An identical
   * catalogue id is refused outright; anything merely close or same-named is put
   * to the dispatcher with the cost stated, because two real shops can share a
   * building.
   */
  const addPin = useCallback(
    (pin: StorePinpoint): boolean => {
      const verdict = findDuplicatePin(pin, pinsRef.current);

      if (verdict.kind === "exact") {
        toast.warning(copy.stage2.dupExact(verdict.existing.storeName, verdict.index + 1));
        return false;
      }
      if (verdict.kind === "likely") {
        setPendingDuplicate({ pin, verdict });
        return false;
      }
      return forceAddPin(pin);
    },
    [forceAddPin]
  );

  const confirmPendingDuplicate = useCallback(() => {
    setPendingDuplicate((pending) => {
      if (pending) forceAddPin(pending.pin);
      return null;
    });
  }, [forceAddPin]);

  const dismissPendingDuplicate = useCallback(() => setPendingDuplicate(null), []);

  /**
   * Asks our own catalogue what is at these coordinates.
   *
   * `GET /places/reverse` returns the nearest verified place within 50 m. It
   * already backs the server's wrong-branch detector; nothing on the web side
   * called it until now. It is the difference between a map click producing
   * "Store 2" with no category and producing the real shop with its `placeId`
   * and `categoryId` - which ten server behaviours depend on, from the ETA's
   * dwell allowance to the geofence radius.
   */
  const resolveFromCatalogue = useCallback(
    async (lat: number, lng: number): Promise<Partial<StorePinpoint> | null> => {
      try {
        const res = await apiClient.get(`/places/reverse?lat=${lat}&lng=${lng}`);
        const place = res.data?.place ?? res.data;
        if (!place?.id) return null;

        // `/places/reverse` deliberately returns a slim record - id, name,
        // address, coordinates - and no category. Since the category is the
        // whole reason for asking, fetch the full row by id. One extra request,
        // and only on a click that actually landed on a shop we know.
        let categoryId: number | null = place.categoryId ?? null;
        if (categoryId == null) {
          try {
            const full = await apiClient.get(`/places/${place.id}`);
            const record = full.data?.place ?? full.data;
            categoryId = record?.categoryId ?? record?.category?.id ?? null;
          } catch {
            // Name and placeId are still worth having on their own.
          }
        }

        return {
          storeName: place.name,
          placeId: place.id,
          categoryId,
          categorySource: (categoryId != null ? "reverse" : null) as CategorySource,
        };
      } catch {
        // A catalogue that is down must not stop a dispatcher pinning.
        return null;
      }
    },
    []
  );

  const panTo = useCallback((lat: number, lng: number, zoom = 16) => {
    if (mapInstance.current && !isNaN(lat) && !isNaN(lng)) {
      mapInstance.current.panTo({ lat, lng });
      mapInstance.current.setZoom(zoom);
    }
  }, []);

  // ── map instance ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scriptLoaded || mapUnavailable || !mapVisible) return;
    let timer: any;

    async function initGoogleMap() {
      if (!mapRef.current) return;
      try {
        const mapsLib = await importGoogleMapsLibrary("maps");
        await importGoogleMapsLibrary("marker");
        await importGoogleMapsLibrary("places");

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass || !mapRef.current) return;
        if (mapRef.current.children.length > 0 && mapInstance.current) return;

        const googleMapId = GOOGLE_MAP_ID;
        const mapOptions: any = {
          center: TACURONG_CENTER,
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
        };
        if (googleMapId) mapOptions.mapId = googleMapId;

        const map = new MapClass(mapRef.current, mapOptions);

        map.addListener("click", async (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const typed = searchInputRef.current.trim();

          const commitPin = (resolvedName: string, extra?: Partial<StorePinpoint>) => {
            const clean = cleanName(resolvedName);
            const fallback = `Store ${pinsRef.current.length + 1}`;
            addPin({
              storeName: clean || fallback,
              latitude: lat,
              longitude: lng,
              ...extra,
            });
            setSearchInput("");
          };

          const resolveByAddress = () => {
            const Geocoder = (window as any).google?.maps?.Geocoder;
            if (!Geocoder) {
              commitPin(`Store ${pinsRef.current.length + 1}`);
              return;
            }
            new Geocoder().geocode({ location: { lat, lng } }, (results: any, status: any) => {
              const placeName = status === "OK" ? resolveReadablePlaceName(results) : null;
              // A clear, honest "Store N" beats a Plus Code the dispatcher
              // would have to decipher.
              commitPin(placeName || `Store ${pinsRef.current.length + 1}`);
            });
          };

          // Our own catalogue first. A click that lands on a shop we already
          // know about should produce that shop - name, placeId AND category -
          // rather than a coordinate Google has to re-describe.
          const known = await resolveFromCatalogue(lat, lng);
          if (known?.storeName) {
            commitPin(known.storeName, {
              placeId: known.placeId,
              categoryId: known.categoryId,
              categorySource: known.categorySource,
            });
            return;
          }

          if (typed) {
            commitPin(typed);
          } else {
            // A business name beats an address every time.
            findNearbyEstablishmentName(map, lat, lng, (name) =>
              name ? commitPin(name) : resolveByAddress()
            );
          }
        });

        mapInstance.current = map;
        setMapReady(true);

        setTimeout(() => {
          const ev = (window as any).google?.maps?.event;
          if (mapInstance.current && ev) {
            ev.trigger(mapInstance.current, "resize");
            mapInstance.current.setCenter(TACURONG_CENTER);
          }
        }, 300);
      } catch (err) {
        console.warn("Google Maps initialization exception caught:", err);
      }
    }

    timer = setTimeout(initGoogleMap, 200);
    return () => clearTimeout(timer);
  }, [scriptLoaded, mapUnavailable, mapVisible, addPin, resolveFromCatalogue]);

  // Stage 2 opening changes the container size; Google needs telling.
  useEffect(() => {
    if (!mapVisible || !mapInstance.current) return;
    const timer = setTimeout(() => {
      const ev = (window as any).google?.maps?.event;
      if (!mapInstance.current || !ev) return;
      ev.trigger(mapInstance.current, "resize");
      const last = pinpoints[pinpoints.length - 1];
      mapInstance.current.setCenter(
        last ? { lat: Number(last.latitude), lng: Number(last.longitude) } : TACURONG_CENTER
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [mapVisible, pinpoints]);

  // ── markers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !(window as any).google) return;
    const g = (window as any).google;

    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];

    pinpoints.forEach((pin, idx) => {
      const latNum = parseFloat(String(pin.latitude));
      const lngNum = parseFloat(String(pin.longitude));
      if (isNaN(latNum) || isNaN(lngNum)) return;
      const pos = { lat: latNum, lng: lngNum };
      const titleStr = `Store #${idx + 1}: ${pin.storeName}`;
      let marker: any;

      if (canUseAdvancedMarkers(g)) {
        marker = new g.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: pos,
          title: titleStr,
          content: new g.maps.marker.PinElement({
            glyphText: String(idx + 1),
            glyphColor: "#FFFFFF",
            background: "#DC2626",
            borderColor: "#991B1B",
          }),
        });
      } else {
        marker = new g.maps.Marker({
          position: pos,
          map: mapInstance.current,
          title: titleStr,
          label: { text: String(idx + 1), color: "#FFFFFF", fontWeight: "bold" },
        });
      }

      const infoWindow = new g.maps.InfoWindow({
        content: `<div style="font-size:12px;font-weight:bold;color:#1F2937;">Store #${idx + 1}: ${pin.storeName}</div>`,
      });
      const clickEvent =
        canUseAdvancedMarkers(g) && marker instanceof g.maps.marker.AdvancedMarkerElement
          ? "gmp-click"
          : "click";
      marker.addListener(clickEvent, () => infoWindow.open(mapInstance.current, marker));
      markersRef.current.push(marker);
    });

    // The customer's drop-off, so the dispatcher can see it relative to shops.
    const custLat = orderDetails?.deliveryLatitude
      ? parseFloat(String(orderDetails.deliveryLatitude))
      : NaN;
    const custLng = orderDetails?.deliveryLongitude
      ? parseFloat(String(orderDetails.deliveryLongitude))
      : NaN;

    if (!isNaN(custLat) && !isNaN(custLng) && custLat !== 0 && custLng !== 0) {
      const custPos = { lat: custLat, lng: custLng };
      const custAddress = orderDetails?.deliveryAddress || "Customer destination";
      let custMarker: any;

      if (canUseAdvancedMarkers(g)) {
        custMarker = new g.maps.marker.AdvancedMarkerElement({
          map: mapInstance.current,
          position: custPos,
          title: `Drop-off: ${custAddress}`,
          content: new g.maps.marker.PinElement({
            glyphText: "H",
            glyphColor: "#FFFFFF",
            background: "#059669",
            borderColor: "#065F46",
          }),
        });
      } else {
        custMarker = new g.maps.Marker({
          position: custPos,
          map: mapInstance.current,
          title: `Drop-off: ${custAddress}`,
          icon: { url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" },
        });
      }

      const custInfoWindow = new g.maps.InfoWindow({
        content: `<div style="font-size:12px;color:#1e293b;padding:2px 4px;">
          <div style="color:#059669;font-weight:800;font-size:11px;margin-bottom:2px;">DROP-OFF</div>
          <div>${custAddress}</div>
          ${customerDisplayName ? `<div style="color:#64748b;font-size:11px;margin-top:2px;">${customerDisplayName}</div>` : ""}
        </div>`,
      });
      const custClickEvent =
        canUseAdvancedMarkers(g) &&
        custMarker instanceof g.maps.marker.AdvancedMarkerElement
          ? "gmp-click"
          : "click";
      custMarker.addListener(custClickEvent, () => custInfoWindow.open(mapInstance.current, custMarker));
      customerMarkerRef.current = custMarker;
      markersRef.current.push(custMarker);
    }

    const last = pinpoints[pinpoints.length - 1];
    if (last) {
      const lat = parseFloat(String(last.latitude));
      const lng = parseFloat(String(last.longitude));
      if (!isNaN(lat) && !isNaN(lng)) mapInstance.current.panTo({ lat, lng });
    }
  }, [pinpoints, orderDetails, customerDisplayName, mapReady]);

  // ── actions ─────────────────────────────────────────────────────────────
  const removePin = useCallback((index: number) => {
    setPinpoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * A pin from catalogue search already carries a categoryId. One dropped by
   * clicking the map never gets one automatically, which left the server's
   * category fallback with no data for the majority of how pins get placed.
   */
  const setPinCategory = useCallback((index: number, categoryId: number | null) => {
    // Choosing by hand settles it - the guess marker clears.
    setPinpoints((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, categoryId, categorySource: categoryId ? ("manual" as CategorySource) : null }
          : p
      )
    );
  }, []);

  const focusPin = useCallback(
    (pin: StorePinpoint) => {
      panTo(parseFloat(String(pin.latitude)), parseFloat(String(pin.longitude)));
    },
    [panTo]
  );

  const hoverResult = useCallback(
    (result: any) => {
      const loc = result?.geometry?.location;
      if (!loc) return;
      panTo(
        typeof loc.lat === "function" ? loc.lat() : Number(loc.lat),
        typeof loc.lng === "function" ? loc.lng() : Number(loc.lng)
      );
    },
    [panTo]
  );

  const selectResult = useCallback(
    (result: any) => {
      if (pinpoints.length >= MAX_PINPOINTS) {
        notifyAtLimit();
        return;
      }
      const loc = result.geometry.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
      const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);
      const streetName = (result.formatted_address || "").split(",")[0] || searchInput;
      // placeId/categoryId are present on catalogue results and absent on Google
      // ones — the honest distinction: a Google result has no catalogue entry to
      // point at, and the server treats a stop without a placeId as uncomparable
      // rather than guessing.
      addPin({
        storeName: result.name || `${searchInput} (${streetName})`,
        latitude: lat,
        longitude: lng,
        placeId: result.placeId ?? null,
        categoryId: result.categoryId ?? null,
        categorySource: result.categorySource ?? (result.categoryId ? "google" : null),
      });
      setSearchInput("");
      setSearchResults([]);
      panTo(lat, lng);
    },
    [pinpoints.length, searchInput, addPin, notifyAtLimit, panTo]
  );

  /**
   * Two-tier search. Tier 1 is our own verified-places catalogue and needs no
   * Google at all — which is what keeps this stage completable when the Maps
   * key is refused.
   */
  const search = useCallback(
    async (e?: React.FormEvent, customQuery?: string) => {
      // Catalogue hits are kept even when we end up pinning a Google result, so
      // the name-match rung of the category ladder still has something to
      // consult. The catalogue's `keywords` column carries aliases and
      // misspellings, which is the only misspelling tolerance the app has.
      let catalogueHits: any[] = [];
      if (e) e.preventDefault();
      const trimmed = (typeof customQuery === "string" ? customQuery : searchInput).trim();
      if (!trimmed) {
        toast.error("Type a store name to search for.");
        return;
      }
      if (pinpoints.length >= MAX_PINPOINTS) {
        notifyAtLimit();
        return;
      }
      setSearchInput(trimmed);
      setIsSearching(true);
      setSearchResults([]);

      // ── TIER 1: our catalogue ─────────────────────────────────────────
      try {
        const dbRes = await apiClient.get(`/places?search=${encodeURIComponent(trimmed)}`);
        const dbPlaces: any[] = dbRes.data || [];
        catalogueHits = dbPlaces;

        if (dbPlaces.length > 1) {
          // A chain with more than one branch — "Jollibee" returns both. Carry
          // each result's catalogue identity so picking the Drive-Thru records
          // the Drive-Thru, not just a coordinate that looks like it.
          setSearchResults(
            dbPlaces.map((p) => ({
              name: p.name,
              formatted_address: p.address + (p.barangay ? `, Brgy. ${p.barangay}` : ""),
              categoryName: p.category?.name,
              geometry: { location: { lat: () => p.latitude, lng: () => p.longitude } },
              isVerifiedDb: true,
              placeId: p.id,
              categoryId: p.categoryId ?? null,
              categorySource: "catalogue" as CategorySource,
            }))
          );
          setIsSearching(false);
          return;
        }

        if (dbPlaces.length === 1) {
          const item = dbPlaces[0];
          const lat = Number(item.latitude);
          const lng = Number(item.longitude);
          addPin({
            storeName: item.name,
            latitude: lat,
            longitude: lng,
            placeId: item.id,
            categoryId: item.categoryId ?? null,
            categorySource: "catalogue",
          });
          setSearchInput("");
          setIsSearching(false);
          panTo(lat, lng);
          return;
        }
      } catch (err) {
        // A catalogue that is unreachable is NOT the same as a catalogue that
        // found nothing - the old code logged both identically and fell through
        // to Google, so an outage looked like "no such shop".
        console.warn("Database place search query warning:", err);
        toast.info(copy.stage2.catalogueUnreachable);
      }

      // ── TIER 2: Google ────────────────────────────────────────────────
      if (mapUnavailable) {
        setIsSearching(false);
        toast.error(
          `"${trimmed}" isn't in our store list, and the map is unavailable to search further.`
        );
        return;
      }

      try {
        const g = (window as any).google;
        if (!g?.maps?.places || !mapInstance.current) {
          setIsSearching(false);
          toast.info("Maps is still loading. Try again in a moment.");
          return;
        }

        const bounds = new g.maps.LatLngBounds(
          new g.maps.LatLng(SERVICE_AREA_BOUNDS.south, SERVICE_AREA_BOUNDS.west),
          new g.maps.LatLng(SERVICE_AREA_BOUNDS.north, SERVICE_AREA_BOUNDS.east)
        );
        const placesService = new g.maps.places.PlacesService(mapInstance.current);

        placesService.textSearch(
          {
            query: `${trimmed} Tacurong City`,
            location: new g.maps.LatLng(TACURONG_CENTER.lat, TACURONG_CENTER.lng),
            radius: 7000,
            bounds,
          },
          (results: any, status: any) => {
            setIsSearching(false);

            if (status === g.maps.places.PlacesServiceStatus.OK && results?.length) {
              const local = results.filter((p: any) => {
                const addr = (p.formatted_address || p.vicinity || "").toLowerCase();
                if (
                  addr.includes("isulan") ||
                  addr.includes("koronadal") ||
                  addr.includes("esperanza") ||
                  addr.includes("marbel")
                ) {
                  return false;
                }
                const isTacurong = addr.includes("tacurong") || addr.includes("sultan kudarat");
                if (!isTacurong && p.geometry?.location) {
                  const lat =
                    typeof p.geometry.location.lat === "function"
                      ? p.geometry.location.lat()
                      : p.geometry.location.lat;
                  const lng =
                    typeof p.geometry.location.lng === "function"
                      ? p.geometry.location.lng()
                      : p.geometry.location.lng;
                  return bounds.contains(new g.maps.LatLng(lat, lng));
                }
                return isTacurong;
              });

              if (local.length > 1) {
                setSearchResults(
                  local.slice(0, 5).map((place: any) => ({
                    name: place.name,
                    formatted_address:
                      place.formatted_address || place.vicinity || "Tacurong City",
                    geometry: place.geometry,
                    isPlaceResult: true,
                    // Google tells us what kind of business this is on every
                    // result. It was being discarded, which is why a
                    // Google-sourced pin had no category at all.
                    googleTypes: place.types || [],
                    categoryId: inferCategoryFromGoogleTypes(
                      place.types,
                      categoriesRef.current
                    ),
                    categorySource: "google" as CategorySource,
                  }))
                );
                return;
              }
              if (local.length === 1) {
                const place = local[0];
                const lat =
                  typeof place.geometry.location.lat === "function"
                    ? place.geometry.location.lat()
                    : place.geometry.location.lat;
                const lng =
                  typeof place.geometry.location.lng === "function"
                    ? place.geometry.location.lng()
                    : place.geometry.location.lng;
                const byTypes = inferCategoryFromGoogleTypes(
                  place.types,
                  categoriesRef.current
                );
                const byName = byTypes
                  ? null
                  : inferCategoryFromCatalogueName(place.name, catalogueHits);
                addPin({
                  storeName: place.name,
                  latitude: lat,
                  longitude: lng,
                  categoryId: byTypes ?? byName,
                  categorySource: byTypes ? "google" : byName ? "name" : null,
                  // Carried even when the local rules already matched: the
                  // category service uses them as a prior when neither did.
                  googleTypes: place.types || [],
                });
                setSearchInput("");
                panTo(lat, lng);
                return;
              }
            }

            toast.error(
              `Couldn't find "${trimmed}" in Tacurong City. Check the spelling, or click the map to drop a pin.`
            );
          }
        );
      } catch (err) {
        console.warn("Place search failed:", err);
        setIsSearching(false);
        toast.error(`Couldn't find "${trimmed}". Click the map to drop a pin.`);
      }
    },
    [searchInput, pinpoints.length, mapUnavailable, addPin, notifyAtLimit, panTo]
  );

  /**
   * When the stores were last sent to the customer, or null.
   *
   * Seeded from the conversation rather than held only in memory: the
   * `pinpoints` card this hook posts is a durable record that the handover
   * happened, so a reload, a second dispatcher opening the order, or a browser
   * crash all recover the same answer instead of asking for the stores again.
   */
  const [storesSentAt, setStoresSentAt] = useState<number | null>(null);

  useEffect(() => {
    const card = [...messages].reverse().find((m: any) => m?.type === "pinpoints");
    if (!card) return;
    setStoresSentAt((prev) =>
      prev ?? (typeof card.timestamp === "number" ? card.timestamp : Date.now())
    );
  }, [messages]);

  const sendToCustomer = useCallback(async () => {
    setIsSaving(true);
    feedback.dismiss();
    try {
      const storesList = pinpoints.map((p) => p.storeName).join(", ");
      const sanitized = pinpoints
        .map((p) => ({
          storeName: p.storeName || "Store",
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          // Sending these is what gives the ETA a per-category dwell allowance
          // instead of the generic default, and what lets the server notice a
          // rider at the wrong branch. Null for a pin outside the catalogue.
          placeId: p.placeId ?? null,
          categoryId: p.categoryId ?? null,
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      // The server re-prices as part of saving pinpoints (distance is now
      // known) and returns the priced errand in the same response — apply it so
      // the fee breakdown updates immediately rather than staying on its stale
      // fetch-on-mount copy.
      const res = await apiClient.post(`/errands/${orderId}/pinpoints`, {
        pinpoints: sanitized,
      });
      onOrderUpdated(res.data?.errand || res.data);

      pushMessage({
        type: "pinpoints",
        text: `I've set the store locations for your errand: ${storesList || "stores updated"}. You can see them on the map in your app.`,
        pinpoints: sanitized,
      });

      // What actually completes stage 2. Pinning used to, which meant placing
      // the first of three pins finished the stage and threw the dispatcher
      // out of the map and into stage 3 mid-task.
      setStoresSentAt(Date.now());
      feedback.showSuccess(copy.stage2.sent(customerDisplayName));
    } catch (err) {
      console.error("Failed to save store pinpoints:", err);
      feedback.showError(copy.stage2.failed);
    } finally {
      setIsSaving(false);
    }
  }, [pinpoints, orderId, onOrderUpdated, pushMessage, feedback, customerDisplayName]);

  return {
    pinpoints,
    mapRef,
    mapInstance,
    customerMarkerRef,
    mapUnavailable,
    mapsStatus,
    scriptLoaded,
    isSaving,
    feedback,
    searchInput,
    setSearchInput,
    isSearching,
    searchResults,
    clearResults: () => setSearchResults([]),
    search,
    selectResult,
    hoverResult,
    removePin,
    setPinCategory,
    focusPin,
    sendToCustomer,
    storesSentAt,
    pendingDuplicate,
    confirmPendingDuplicate,
    dismissPendingDuplicate,
  };
}
