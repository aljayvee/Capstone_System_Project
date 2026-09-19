import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Navigation,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { DispatcherCard } from "@/components/panel/DispatcherCard";
import { toast } from "sonner";

/**
 * Where the order is going, and how to reach the person receiving it.
 *
 * Route board build. Four things here were breaches rather than preferences.
 *
 * The Google map marker carried `glyphText: "\u{1F3E0}"` — a house emoji as
 * the pin glyph — over `#059669` on `#065F46`, two greens that appear nowhere
 * in this product's palette, with a Google-hosted `green-dot.png` as the
 * fallback icon. The pin is navy now, the glyph is gone, and the fallback
 * uses Google's own default rather than fetching an image off their CDN.
 *
 * `handleCopy` called `navigator.clipboard.writeText(text)` without awaiting
 * it and fired `toast.success("Copied ...")` on the next line. The clipboard
 * API rejects on an insecure origin or a denied permission, so the toast
 * claimed a copy that had not happened — on the panel holding the phone
 * number a dispatcher is about to dial.
 *
 * The body was three levels of surface (a tinted page ground, white cards on
 * it, rows inside those) with three tinted icon chips and two near-identical
 * metadata cards in a two-column grid. It is one plate with regions and
 * label rules now.
 *
 * The floating map pill wore `backdrop-blur-xs`, `shadow-md` and
 * `animate-pulse` on a dot that indicates nothing live.
 */

interface CustomerLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number | string | null;
  deliveryLongitude?: number | string | null;
  onFocusInTools?: () => void;
}

export const CustomerLocationModal: React.FC<CustomerLocationModalProps> = ({
  isOpen,
  onClose,
  customerName = "Customer",
  customerPhone,
  deliveryAddress = "Tacurong City, Sultan Kudarat",
  deliveryLatitude,
  deliveryLongitude,
  onFocusInTools,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapProvider, setMapProvider] = useState<"osm" | "google">("osm");
  const [isMapReady, setIsMapReady] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parse coordinates safely
  const parsedLat = deliveryLatitude ? parseFloat(String(deliveryLatitude)) : NaN;
  const parsedLng = deliveryLongitude ? parseFloat(String(deliveryLongitude)) : NaN;
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;

  // Default to Tacurong City center if coordinates missing
  const activeLat = hasValidCoords ? parsedLat : 6.68136;
  const activeLng = hasValidCoords ? parsedLng : 124.66345;

  const handleCopy = async (text: string, fieldName: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`Copied the ${fieldName}`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Said out loud rather than swallowed: the reader is about to act on
      // something they believe is on their clipboard.
      toast.error(`Could not copy the ${fieldName}. Select it and copy by hand.`);
    }
  };

  const initGoogleMap = useCallback(async () => {
    if (!mapContainerRef.current || !isOpen || mapProvider !== "google") return;

    try {
      const [{ Map }, markerLib] = await Promise.all([
        importGoogleMapsLibrary("maps"),
        importGoogleMapsLibrary("marker").catch(() => null),
      ]);

      const g = (window as any).google;
      if (!g?.maps || !mapContainerRef.current) return;

      const pos = { lat: activeLat, lng: activeLng };

      const googleMapId = (import.meta as any).env?.VITE_GOOGLE_MAP_ID;
      const mapOptions: any = {
        center: pos,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
      };
      if (googleMapId) {
        mapOptions.mapId = googleMapId;
      }

      const map = new Map(mapContainerRef.current, mapOptions);

      mapInstanceRef.current = map;

      let marker: any;
      const titleStr = `Customer drop-off: ${deliveryAddress}`;

      if (markerLib?.AdvancedMarkerElement && g.maps.marker?.PinElement) {
        // Navy on deep navy, no glyph. The emoji it used to carry was the one
        // pictograph left anywhere in this console, and it sat on two greens
        // that are not in the palette.
        const pinElement = new g.maps.marker.PinElement({
          glyphColor: "#FFFFFF",
          background: "#0F2035",
          borderColor: "#0B132B",
        });

        marker = new markerLib.AdvancedMarkerElement({
          map,
          position: pos,
          title: titleStr,
          content: pinElement,
        });
      } else {
        // No `icon`: the classic marker falls back to Google's own, rather
        // than pulling a green-dot PNG off maps.google.com on every open.
        marker = new g.maps.Marker({
          position: pos,
          map,
          title: titleStr,
        });
      }

      markerRef.current = marker;
      setIsMapReady(true);
    } catch (err) {
      console.warn("Google Maps JS API load failed, switching to OSM view:", err);
      setMapProvider("osm");
      setIsMapReady(true);
    }
  }, [isOpen, mapProvider, activeLat, activeLng, deliveryAddress]);

  useEffect(() => {
    if (isOpen) {
      if (mapProvider === "google") {
        setIsMapReady(false);
        const timer = setTimeout(initGoogleMap, 150);
        return () => clearTimeout(timer);
      } else {
        setIsMapReady(true);
      }
    } else {
      if (markerRef.current) {
        if (markerRef.current.setMap) markerRef.current.setMap(null);
        else markerRef.current.map = null;
        markerRef.current = null;
      }
      mapInstanceRef.current = null;
    }
  }, [isOpen, mapProvider, initGoogleMap]);

  // OpenStreetMap Embed URL with Bounding Box and Marker Pin
  const deltaLat = 0.0035;
  const deltaLng = 0.0055;
  const bbox = `${activeLng - deltaLng}%2C${activeLat - deltaLat}%2C${activeLng + deltaLng}%2C${activeLat + deltaLat}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${activeLat}%2C${activeLng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeLat},${activeLng}`;

  const providerTab = (id: "osm" | "google", label: string) => (
    <button
      type="button"
      onClick={() => setMapProvider(id)}
      aria-pressed={mapProvider === id}
      className={cn(
        "min-h-9 cursor-pointer rounded-trim px-3 text-micro uppercase transition-colors",
        mapProvider === id
          ? "bg-board-field text-board-plate"
          : "text-ink-muted hover:text-ink"
      )}
    >
      {label}
    </button>
  );

  const copyButton = (text: string, field: string, label: string) => (
    <button
      type="button"
      onClick={() => void handleCopy(text, field)}
      aria-label={copiedField === field ? `${label} copied` : `Copy the ${field}`}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-plate hover:text-ink"
    >
      {copiedField === field ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-surface="dispatch"
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-modal border-edge bg-board-plate p-0 shadow-plate"
      >
        <DialogHeader
          data-on-field
          className="flex shrink-0 flex-row items-start justify-between gap-3 bg-board-field px-4 py-3 shadow-field"
        >
          <div className="min-w-0">
            <DialogTitle className="truncate text-panel text-board-plate">
              Where this is going
            </DialogTitle>
            <DialogDescription className="text-label text-board-trim">
              The drop-off {customerName} gave for this order.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close this dialog"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-trim text-board-trim transition-colors hover:bg-board-plate/10 hover:text-board-plate"
          >
            <X size={16} />
          </DialogClose>
        </DialogHeader>

        {/* Which map is drawing it */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hairline bg-board-ground px-3 py-1.5">
          <span className="text-micro uppercase text-ink-muted">Map</span>
          <div className="flex items-center gap-1">
            {providerTab("osm", "OpenStreetMap")}
            {providerTab("google", "Google")}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-56 w-full border-b border-hairline bg-board-ground sm:h-64">
          {mapProvider === "osm" ? (
            <iframe
              title="Customer delivery pinpoint map"
              src={osmEmbedUrl}
              className="h-full w-full border-0"
              loading="lazy"
            />
          ) : (
            <div ref={mapContainerRef} className="h-full w-full" />
          )}

          {!isMapReady && mapProvider === "google" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-board-ground text-body text-ink-muted">
              <Loader2 size={18} className="animate-spin" />
              <span>Loading the map</span>
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <DispatcherCard.Region padding="sm">
            <DispatcherCard.Label as="h4">Drop-off address</DispatcherCard.Label>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" />
                <p className="m-0 min-w-0 break-words text-body text-ink">{deliveryAddress}</p>
              </div>
              {copyButton(deliveryAddress, "address", "Address")}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-2">
              <span data-figure className="font-mono text-label tabular-nums text-ink-muted">
                {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
              </span>
              {/* Says what it is rather than "Copy GPS" in a blue link. */}
              {copyButton(`${activeLat}, ${activeLng}`, "coordinates", "Coordinates")}
            </div>

            {!hasValidCoords ? (
              <p className="mt-2 text-label text-status-waiting-ink">
                No coordinates were recorded for this order. The map is showing the centre of
                Tacurong, not the drop-off.
              </p>
            ) : null}
          </DispatcherCard.Region>

          {/* One list, not two matching cards in a two-column grid. */}
          <DispatcherCard.Region padding="sm">
            <DispatcherCard.Label as="h4">Recipient</DispatcherCard.Label>
            <dl className="m-0">
              <div className="flex items-baseline justify-between gap-2 py-0.5">
                <dt className="text-body text-ink-muted">Name</dt>
                <dd className="m-0 min-w-0 truncate text-body text-ink">{customerName}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-hairline pt-1.5">
                <dt className="flex items-center gap-1.5 text-body text-ink-muted">
                  <Phone size={14} />
                  Contact
                </dt>
                <dd className="m-0 flex min-w-0 items-center gap-1">
                  {customerPhone ? (
                    <>
                      <span
                        data-figure
                        className="truncate font-mono text-label tabular-nums text-ink"
                      >
                        {customerPhone}
                      </span>
                      {copyButton(customerPhone, "phone number", "Phone number")}
                    </>
                  ) : (
                    <span className="text-body text-ink-muted">No number on file</span>
                  )}
                </dd>
              </div>
            </dl>
          </DispatcherCard.Region>
        </div>

        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-hairline bg-board-ground px-4 py-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-trim px-2 text-label text-ink-muted transition-colors hover:text-ink"
          >
            <ExternalLink size={14} />
            <span>Open in Google Maps</span>
          </a>

          <div className="flex items-center gap-2">
            {onFocusInTools && (
              <DispatcherButton
                type="button"
                size="sm"
                variant="secondary"
                icon={<Navigation size={14} />}
                onClick={() => {
                  onClose();
                  onFocusInTools();
                }}
              >
                Focus on the map
              </DispatcherButton>
            )}

            <DispatcherButton type="button" size="sm" variant="field" onClick={onClose}>
              Done
            </DispatcherButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
