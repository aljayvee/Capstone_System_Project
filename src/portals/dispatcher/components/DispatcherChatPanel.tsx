import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue } from "firebase/database";
import { io, Socket } from "socket.io-client";
import { database } from "../../../firebase/config";
import { apiClient } from "../../../services/apiClient";
import { loadGoogleMapsScript, importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import { formatErrandId } from "../../../utils/formatErrandId";
import { ChatBubble } from "../../../components/chat/ChatBubble";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DispatcherInlineBanner, useInlineMessage } from "./ui/DispatcherInlineBanner";
import { DispatcherButton } from "./ui/DispatcherButton";
import {
  X,
  Send,
  MessageSquare,
  MapPin,
  UserCheck,
  Slash,
  Plus,
  Trash2,
  CheckCircle2,
  Compass,
  Search,
  Target,
  Loader2,
  CreditCard,
  Pencil,
  Package,
  Bike,
  Sparkles,
  Layers,
  ChevronRight,
  Copy,
  Check,
  Phone,
  Lock,
  Banknote,
  AlertCircle,
  Store,
  Receipt,
  Focus,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Clock,
  GripVertical,
} from "lucide-react";
import { UnauthorizedErrandScreen } from "./UnauthorizedErrandScreen";
import { SERVICE_AREA_BOUNDS } from "../../../constants/serviceArea";
import { formatPeso } from "../../../utils/format";

interface DispatcherChatPanelProps {
  orderId: string;
  dispatcher: any;
  onClose: () => void;
  onRefreshOrders?: () => void;
  readOnly?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  role: "customer" | "dispatcher";
  text: string;
  timestamp: number;
}

interface StorePinpoint {
  id?: number;
  storeName: string;
  latitude: number;
  longitude: number;
  address?: string;
  orderIndex?: number;
  // Set when this stop came from the verified-places catalogue rather than a
  // Google result or a bare map click. Null in those cases, and the server
  // treats a stop without a placeId as uncomparable rather than guessing.
  placeId?: string | null;
  categoryId?: number | null;
}

const TACURONG_POI_CATALOG = [
  {
    name: "Jollibee Tacurong Center (Main)",
    address: "National Highway, City Center, Tacurong City",
    keywords: ["jollibee", "jolibee", "center", "main"],
    lat: 6.6873,
    lng: 124.6752,
  },
  {
    name: "Jollibee Tacurong Drive-Thru (DT)",
    address: "National Highway Bypass, Tacurong City",
    keywords: ["jollibee", "jolibee", "dt", "drive-thru", "drive thru"],
    lat: 6.6890,
    lng: 124.6788,
  },
  {
    name: "Mercury Drug Tacurong Center",
    address: "Alunan Highway, Tacurong City",
    keywords: ["mercury", "mercury drug", "pharmacy"],
    lat: 6.6702,
    lng: 124.6635,
  },
  {
    name: "Mercury Drug Tacurong Highway",
    address: "National Highway, Tacurong City",
    keywords: ["mercury", "mercury drug", "pharmacy"],
    lat: 6.6718,
    lng: 124.6650,
  },
  {
    name: "Watsons Pharmacy Tacurong",
    address: "City Center, Tacurong City",
    keywords: ["watsons", "pharmacy"],
    lat: 6.6698,
    lng: 124.6629,
  },
  {
    name: "Robinsons Supermarket Tacurong",
    address: "National Highway, Tacurong City",
    keywords: ["robinsons", "robinson", "supermarket", "grocery"],
    lat: 6.6728,
    lng: 124.6659,
  },
  {
    name: "SM Supermarket / Savemore Tacurong",
    address: "Lapu-Lapu St, Tacurong City",
    keywords: ["sm", "savemore", "supermarket", "grocery"],
    lat: 6.6715,
    lng: 124.6648,
  },
  {
    name: "Chooks-to-Go Tacurong City Center",
    address: "Alunan Highway corner Bonifacio St, Tacurong City",
    keywords: ["chooks", "chooks-to-go", "chooks to go", "choox", "roast chicken"],
    lat: 6.6912,
    lng: 124.6765,
  },
  {
    name: "Chooks-to-Go Tacurong Highway",
    address: "National Highway (near Public Market), Tacurong City",
    keywords: ["chooks", "chooks-to-go", "chooks to go", "choox", "roast chicken", "highway"],
    lat: 6.6854,
    lng: 124.6738,
  },
];

const QUICK_TACURONG_POIS = [
  { label: "🍗 Jollibee Main", query: "Jollibee Tacurong Center" },
  { label: "💊 Mercury Drug", query: "Mercury Drug Tacurong Highway" },
  { label: "🛍️ Public Market", query: "Tacurong Public Market" },
  { label: "🍜 Chowking", query: "Chowking Tacurong" },
  { label: "🧁 Goldilocks", query: "Goldilocks Tacurong" },
  { label: "🏬 KCC Mall", query: "KCC Tacurong" },
];

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

const MAX_PINPOINTS = 3;

/** One place for the "you've hit the pin cap" message — it was three copies of the same string. */
function notifyMaxPinpoints() {
  toast.warning(`You've pinned ${MAX_PINPOINTS} stores — that's the limit for one errand.`);
}

/**
 * A Plus Code (Open Location Code) — Google's own fallback "address" for a
 * point with no real street address, e.g. "MMF7+6G8" or "7QCX8VJP+6G". It's
 * grid coordinates spelled with letters, not a name — a dispatcher glancing at
 * a store list has no way to know what it refers to.
 */
const PLUS_CODE_PATTERN = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

/**
 * Turns a reverse-geocode response into a name a dispatcher can actually read.
 *
 * Google orders reverse-geocode results from most to least specific, and for a
 * point with no addressed building nearby — an alley, a market stall, a spot in
 * a parking lot, all common in Tacurong — the MOST specific result is routinely
 * a Plus Code, not a street address. The old code took `results[0]` unconditionally,
 * so clicking exactly the kind of place that doesn't have a tidy address was the
 * one case guaranteed to produce a code instead of a name.
 *
 * Walks the results for the first one that isn't a Plus Code, in either the
 * type Google tags it with or the text it produced — a formatted_address can
 * still open on a Plus Code (e.g. "MMF7+6G8, Tacurong City") even when the
 * result's own `types` don't say so. Returns null rather than guess when
 * nothing usable exists, so the caller's honest "Store N" fallback is what a
 * dispatcher sees instead of a code they'd have to decipher.
 */
/**
 * How close a click has to land to a business for that business to count as
 * "this is what was pinned," rather than a nearby but different building.
 * A little looser than a building footprint to absorb map-click and GPS-pin
 * imprecision, tight enough that it won't reach across a street.
 */
const ESTABLISHMENT_MATCH_RADIUS_METERS = 30;

/** Metres between two lat/lng points. Equirectangular — fine at this scale. */
function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const EARTH_RADIUS_M = 6371000;
  const rad = Math.PI / 180;
  const scale = Math.cos(((a.lat + b.lat) / 2) * rad);
  const dx = (b.lng - a.lng) * scale * rad * EARTH_RADIUS_M;
  const dy = (b.lat - a.lat) * rad * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

/**
 * The name of the business at a clicked point, if the click landed on one.
 *
 * A plain reverse-geocode answers "what is this address," which for a spot
 * sitting on top of a real store is routinely a street number or a building
 * name — the geocoder has no idea a business is there, because that isn't
 * what it's for. The Places API is what actually knows about businesses, so
 * this is a separate, small-radius search that only fires to answer one
 * question: is there an establishment close enough to the click that it's
 * clearly what the dispatcher meant to pin, not a plain address nearby.
 *
 * Ranked by actual distance from the click, not Places' own relevance
 * ordering — a small, well-known chain a little farther off must not win
 * over the exact, less prominent shop the pin landed on.
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
        if (distance <= ESTABLISHMENT_MATCH_RADIUS_METERS && (!closest || distance < closest.distance)) {
          closest = { name: place.name, distance };
        }
      }
      callback(closest?.name ?? null);
    }
  );
}

function resolveReadablePlaceName(results: any[] | null | undefined): string | null {
  for (const result of results || []) {
    if (result?.types?.includes("plus_code")) continue;

    // Only the leading segment — never the whole formatted_address as a last
    // resort. "MMF7+6G8, Tacurong City, Sultan Kudarat" isn't a pure Plus Code
    // string so it would slide past the regex below, but it still OPENS with
    // one, which is exactly what a dispatcher can't read. Falling through to
    // the next result is more honest than handing back a longer string with
    // the same code still sitting at the front of it.
    const candidates = [
      result?.address_components?.[0]?.long_name,
      result?.formatted_address?.split(",")[0],
    ];

    for (const candidate of candidates) {
      const trimmed = candidate?.trim();
      if (trimmed && !PLUS_CODE_PATTERN.test(trimmed)) {
        return trimmed;
      }
    }
  }
  return null;
}

export const DispatcherChatPanel: React.FC<DispatcherChatPanelProps> = ({
  orderId,
  dispatcher,
  onClose,
  onRefreshOrders,
  readOnly = false,
}) => {
  // Read inside the order-details effect without being one of its triggers —
  // see the note at that effect for why this exists.
  const dispatcherRef = useRef(dispatcher);
  dispatcherRef.current = dispatcher;

  // Core Chat & Errand state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Focus Step Mode: 1 | 2 | 3 | 4 | "ALL"
  const [activeStepView, setActiveStepView] = useState<1 | 2 | 3 | 4 | "ALL">("ALL");

  // Responsive mobile/compact tab switch (< 1024px)
  const [mobileActiveTab, setMobileActiveTab] = useState<"chat" | "tools">("chat");

  // Resizable Split Pane between Chat (Left) and Workflow Tools (Right)
  const [chatWidthPercent, setChatWidthPercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sugo_dispatcher_chat_split_width");
      const parsed = saved ? parseFloat(saved) : 40;
      return parsed >= 25 && parsed <= 65 ? parsed : 40;
    } catch {
      return 40;
    }
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [showResizeTooltip, setShowResizeTooltip] = useState(false);
  const splitWorkspaceRef = useRef<HTMLDivElement | null>(null);

  // Global mouse drag listener for panel resizing
  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitWorkspaceRef.current) return;
      const containerRect = splitWorkspaceRef.current.getBoundingClientRect();
      if (containerRect.width <= 0) return;
      const rawPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      // Clamp between 25% (minimum chat width) and 60% (maximum chat width)
      const clampedPercent = Math.min(60, Math.max(25, rawPercent));
      setChatWidthPercent(clampedPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      setShowResizeTooltip(false);
      try {
        localStorage.setItem("sugo_dispatcher_chat_split_width", String(chatWidthPercent));
      } catch {}
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDraggingSplitter, chatWidthPercent]);

  // Payment mode verification state
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string | null>(null);
  const [isPromptingPayment, setIsPromptingPayment] = useState(false);
  const [isEnablingPayment, setIsEnablingPayment] = useState(false);

  // Tools state (Pinpoints, Items, Maps)
  const [pinpoints, setPinpoints] = useState<StorePinpoint[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const pinFeedback = useInlineMessage();

  // Requested Items state
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editableItems, setEditableItems] = useState<{ itemName: string; storeCategory?: string; quantity: number }[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const itemsFeedback = useInlineMessage();

  // Custom Search Input state for Google Maps
  const [searchStoreInput, setSearchStoreInput] = useState("");
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Google Maps ref & instances
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Customer Confirmation state
  const [isCustomerConfirmed, setIsCustomerConfirmed] = useState(false);
  const [hasSentConfirmationCard, setHasSentConfirmationCard] = useState(false);

  // Dynamic Rate Configuration from backend
  const [rateConfig, setRateConfig] = useState<any>(null);

  // Dynamic Merchant Categories from API
  const [merchantCategories, setMerchantCategories] = useState<{ id: number; name: string; status?: string }[]>([]);
  const [activeCategoryBatch, setActiveCategoryBatch] = useState<string>("ALL");

  useEffect(() => {
    async function loadRateConfig() {
      try {
        const res = await apiClient.get("/rate-config");
        if (res.data) setRateConfig(res.data);
      } catch (err) {
        console.warn("Failed to load rate config:", err);
      }
    }
    async function loadMerchantCategories() {
      try {
        const res = await apiClient.get<any[]>("/merchant-categories");
        if (Array.isArray(res.data)) {
          const active = res.data.filter((c) => !c.status || c.status === "Active");
          setMerchantCategories(active);
        }
      } catch (err) {
        console.warn("Failed to load merchant categories:", err);
      }
    }
    loadRateConfig();
    loadMerchantCategories();
  }, []);

  // Copy feedback state
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyText = (text: string, type: "order" | "phone") => {
    navigator.clipboard.writeText(text);
    if (type === "order") {
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Assign Rider state (Single Assign Rider Now action)
  const [isAssigning, setIsAssigning] = useState(false);
  const [showPassByConfirm, setShowPassByConfirm] = useState(false);
  const [panelError, setPanelError] = useState<{
    variant: "unauthorized" | "not_found";
    claimantName?: string;
    reason?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatcherFirstName = dispatcher?.name ? dispatcher.name.split(" ")[0] : "Dispatcher";

  const isReadOnly =
    readOnly ||
    (orderDetails &&
      ["PASSING BY", "CANCELLED", "COMPLETED", "DELIVERED"].includes(
        String(orderDetails.status).toUpperCase()
      ));

  const isPaymentEnabled = Boolean(orderDetails?.paymentEnabledAt);

  // Fetch Order details for header summary card
  useEffect(() => {
    async function fetchOrderInfo() {
      try {
        const res = await apiClient.get(`/errands/${orderId}`);
        const errandData = res.data?.errand || res.data || null;

        if (!errandData) {
          setPanelError({
            variant: "not_found",
            reason: `The requested errand with reference ID #${formatErrandId(orderId)} does not exist.`,
          });
          return;
        }

        // Front-end authorization check: If current user is a dispatcher and this errand belongs to another dispatcher
        const currentRole = String(dispatcherRef.current?.role || "").toLowerCase();
        if (
          currentRole === "dispatcher" &&
          errandData?.dispatcherId &&
          dispatcherRef.current?.id &&
          String(errandData.dispatcherId) !== String(dispatcherRef.current.id)
        ) {
          const claimant = errandData.dispatcherName || "another dispatcher";
          setPanelError({
            variant: "unauthorized",
            claimantName: claimant,
            reason: `This errand transaction is currently claimed and being handled by ${claimant}.`,
          });
          return;
        }

        setOrderDetails(errandData);

        // Hydrate existing store pinpoints if already saved on the errand
        if (errandData?.pinpoints && Array.isArray(errandData.pinpoints) && errandData.pinpoints.length > 0) {
          // Carry the catalogue identity back in too, or reopening an errand and
          // re-saving its pins would quietly strip what the dispatcher had
          // already chosen.
          setPinpoints(
            errandData.pinpoints.map((p: any) => ({
              id: p.id,
              storeName: p.storeName || p.name || "Store",
              latitude: Number(p.latitude || p.lat),
              longitude: Number(p.longitude || p.lng),
              placeId: p.placeId ?? null,
              categoryId: p.categoryId ?? null,
            }))
          );
        }
      } catch (err: any) {
        if (err.response?.status === 403) {
          const errMsg = err.response?.data?.error || err.response?.data?.message || "You do not have permission to view or manage this errand.";
          setPanelError({
            variant: "unauthorized",
            claimantName: "Assigned Dispatcher",
            reason: errMsg,
          });
          return;
        }

        const notFoundMsg = err.response?.data?.error || err.response?.data?.message || `Errand reference #${formatErrandId(orderId)} was not found.`;
        setPanelError({
          variant: "not_found",
          reason: notFoundMsg,
        });
      }
    }
    if (orderId) {
      fetchOrderInfo();
    }
    // Deliberately just [orderId] — this fetch re-hydrates `pinpoints` (and
    // everything else derived from orderDetails) from whatever is LAST SAVED
    // on the server, discarding any local edit made since. `onClose` isn't
    // even read inside this effect, and `dispatcher` is read via a ref instead
    // of being a dependency here, precisely so a parent handing down a fresh
    // (unmemoized) callback or object on every render can't retrigger this.
    //
    // That was a real bug, not a hypothetical one: DispatcherPortal's
    // `handleCloseChat` is a plain function, recreated every render, passed
    // straight through as `onClose`. With it in this array, any unrelated
    // re-render of the portal — a chat message arriving, a socket tick —
    // refired this fetch mid-edit. A dispatcher who removed a pin and dropped
    // a new one would watch the new pin vanish and the old, already-sent one
    // reappear, because the refetch overwrote their unsaved local state with
    // the server's stale copy before they'd had a chance to save it.
  }, [orderId]);

  // Trigger Google Maps resize when switching to tools tab on compact screens
  useEffect(() => {
    if (mobileActiveTab === "tools" && googleMapInstance.current && (window as any).google?.maps?.event) {
      setTimeout(() => {
        (window as any).google.maps.event.trigger(googleMapInstance.current, "resize");
        const center = pinpoints.length > 0
          ? { lat: Number(pinpoints[0].latitude), lng: Number(pinpoints[0].longitude) }
          : { lat: 6.671, lng: 124.6644 };
        googleMapInstance.current.setCenter(center);
      }, 100);
    }
  }, [mobileActiveTab, pinpoints]);

  const handleEnablePayment = async () => {
    setIsEnablingPayment(true);
    try {
      const res = await apiClient.post(`/errands/${orderId}/enable-payment`);
      setOrderDetails(res.data?.errand || res.data);
    } catch (err) {
      console.error("Failed to enable payment selection:", err);
      toast.error("Couldn't enable payment selection. Try again in a moment.");
    } finally {
      setIsEnablingPayment(false);
    }
  };

  useEffect(() => {
    async function fetchPaymentSelection() {
      try {
        const res = await apiClient.get(`/errands/${orderId}/payment-selection`);
        setConfirmedPaymentMode(res.data?.paymentMode?.name ?? null);
      } catch (err) {
        console.warn("Failed to fetch payment selection:", err);
      }
    }
    if (orderId) {
      fetchPaymentSelection();
    }
  }, [orderId]);

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL);
    socket.on("payment:selected", (payload: { errandId: string; paymentMode?: { name: string } }) => {
      if (String(payload.errandId) !== String(orderId)) return;
      setConfirmedPaymentMode(payload.paymentMode?.name ?? null);
    });
    socket.on("order:confirmed", (payload: { errandId: string }) => {
      if (String(payload.errandId) !== String(orderId)) return;
      setIsCustomerConfirmed(true);
    });
    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const handlePromptPaymentMode = async () => {
    setIsPromptingPayment(true);
    try {
      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "payment_prompt",
        text: "Please choose your payment method so I can confirm it. No payment is being taken right now.",
        timestamp: Date.now(),
      });
    } finally {
      setIsPromptingPayment(false);
    }
  };

  // Load Google Maps JavaScript API dynamically
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setIsMapLoaded(true))
      .catch((err) => console.warn("Google Maps script load failed:", err));
  }, []);

  // Initialize Google Maps instance when panel opens
  useEffect(() => {
    let timer: any;

    async function initGoogleMap() {
      if (!isMapLoaded || !mapRef.current) return;

      try {
        const mapsLib = await importGoogleMapsLibrary("maps");
        await importGoogleMapsLibrary("marker");
        await importGoogleMapsLibrary("places");

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass || !mapRef.current) {
          console.warn("Google Maps Map class not available.");
          return;
        }

        if (mapRef.current.children.length > 0 && googleMapInstance.current) {
          return;
        }

        const tacurongCenter = { lat: 6.671, lng: 124.6644 };
        const map = new MapClass(mapRef.current, {
          center: tacurongCenter,
          zoom: 14,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
        });

        // Click on Google Maps to drop a pinpoint marker with real location name resolution
        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const typed = searchStoreInput.trim();

          const commitPin = (resolvedName: string) => {
            // Clean illegal Firebase RTDB key characters: ., #, $, /, [, ]
            const cleanName = resolvedName.replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();
            setPinpoints((prev) => {
              if (prev.length >= 3) {
                notifyMaxPinpoints();
                return prev;
              }
              const storeNum = prev.length + 1;
              const finalName = cleanName || `Store ${storeNum}`;
              return [...prev, { storeName: finalName, latitude: lat, longitude: lng }];
            });
            setSearchStoreInput("");
          };

          const resolveByAddress = () => {
            if (!(window as any).google?.maps?.Geocoder) {
              commitPin(`Store ${pinpoints.length + 1}`);
              return;
            }
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              const placeName = status === "OK" ? resolveReadablePlaceName(results) : null;
              // A clear, honest "Store N" beats a Plus Code the dispatcher would
              // have to decipher — this is the same placeholder already used
              // when geocoding fails outright, just also used when it succeeds
              // with nothing readable to show for it.
              commitPin(placeName || `Store ${pinpoints.length + 1}`);
            });
          };

          if (typed) {
            commitPin(typed);
          } else {
            // A business name beats an address every time — try that first,
            // and only fall back to reverse-geocoding when the click didn't
            // land on anything Places knows about.
            findNearbyEstablishmentName(map, lat, lng, (establishmentName) => {
              if (establishmentName) {
                commitPin(establishmentName);
              } else {
                resolveByAddress();
              }
            });
          }
        });

        googleMapInstance.current = map;

        setTimeout(() => {
          if (googleMapInstance.current && (window as any).google?.maps?.event) {
            (window as any).google.maps.event.trigger(googleMapInstance.current, "resize");
            googleMapInstance.current.setCenter(tacurongCenter);
          }
        }, 300);
      } catch (err) {
        console.warn("Google Maps initialization exception caught:", err);
      }
    }

    timer = setTimeout(initGoogleMap, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [isMapLoaded, activeStepView]);

  // Re-trigger Google Maps resize and centering whenever activeStepView changes to 1 or ALL
  useEffect(() => {
    if (activeStepView === 1 || activeStepView === "ALL") {
      const timer = setTimeout(() => {
        if (googleMapInstance.current && (window as any).google?.maps?.event) {
          (window as any).google.maps.event.trigger(googleMapInstance.current, "resize");
          if (pinpoints.length > 0) {
            const last = pinpoints[pinpoints.length - 1];
            const lat = parseFloat(String(last.latitude));
            const lng = parseFloat(String(last.longitude));
            if (!isNaN(lat) && !isNaN(lng)) {
              googleMapInstance.current.setCenter({ lat, lng });
            }
          } else {
            googleMapInstance.current.setCenter({ lat: 6.671, lng: 124.6644 });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeStepView, pinpoints]);

  // Update Google Maps markers when pinpoints array changes
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google) return;
    const g = (window as any).google;

    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];

    pinpoints.forEach((pin, idx) => {
      let marker: any;
      const latNum = parseFloat(String(pin.latitude));
      const lngNum = parseFloat(String(pin.longitude));
      const pos = { lat: latNum, lng: lngNum };
      const titleStr = `Store #${idx + 1}: ${pin.storeName}`;

      if (g.maps.marker && g.maps.marker.AdvancedMarkerElement) {
        const pinElement = new g.maps.marker.PinElement({
          glyphText: String(idx + 1),
          glyphColor: "#FFFFFF",
          background: "#DC2626",
          borderColor: "#991B1B",
        });

        marker = new g.maps.marker.AdvancedMarkerElement({
          map: googleMapInstance.current,
          position: pos,
          title: titleStr,
          content: pinElement,
        });
      } else {
        marker = new g.maps.Marker({
          position: pos,
          map: googleMapInstance.current,
          title: titleStr,
          label: {
            text: String(idx + 1),
            color: "#FFFFFF",
            fontWeight: "bold",
          },
        });
      }

      const infoWindow = new g.maps.InfoWindow({
        content: `<div style="font-size:12px; font-weight:bold; color:#1F2937;">📍 Store #${idx + 1}: ${pin.storeName}</div>`,
      });

      const clickEvent = (g.maps.marker && g.maps.marker.AdvancedMarkerElement && marker instanceof g.maps.marker.AdvancedMarkerElement)
        ? "gmp-click"
        : "click";

      marker.addListener(clickEvent, () => {
        infoWindow.open(googleMapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });

    if (pinpoints.length > 0 && googleMapInstance.current) {
      const last = pinpoints[pinpoints.length - 1];
      const lastLat = parseFloat(String(last.latitude));
      const lastLng = parseFloat(String(last.longitude));
      if (!isNaN(lastLat) && !isNaN(lastLng)) {
        googleMapInstance.current.panTo({ lat: lastLat, lng: lastLng });
      }
    }
  }, [pinpoints]);

  // Load chat messages from Firebase
  useEffect(() => {
    if (!orderDetails || panelError) return;
    const messagesRef = ref(database, `chats/${orderId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: ChatMessage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        parsed.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(parsed);
      } else {
        setMessages([]);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [orderId, orderDetails, panelError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const hasCard = messages.some((m: any) => m.type === "order_confirmation");
    if (hasCard) setHasSentConfirmationCard(true);

    const hasConfirmed = messages.some(
      (m: any) => m.type === "order_confirmation" && m.confirmed === true
    );
    if (hasConfirmed) setIsCustomerConfirmed(true);
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const messagesRef = ref(database, `chats/${orderId}/messages`);
    push(messagesRef, {
      senderId: String(dispatcher?.id || "dispatcher-1"),
      senderName: dispatcherFirstName,
      role: "dispatcher",
      text: trimmed,
      timestamp: Date.now(),
    });

    setInputText("");
  };

  const handleRemovePinpoint = (index: number) => {
    setPinpoints((prev) => prev.filter((_, i) => i !== index));
  };

  // A pin dropped from the catalogue search already carries a categoryId
  // (see handleSelectPlaceResult). One dropped by clicking the map or typed
  // free-hand never gets one automatically — there was no way to set it at
  // all, which meant resolveCategoryModes' fallback (consult the pinned
  // stops' categories once the customer's own picks don't resolve) had no
  // data to fall back to for the majority of how pins actually get placed.
  // This lets the dispatcher supply it directly for exactly that case.
  const handleSetPinpointCategory = (index: number, categoryId: number | null) => {
    setPinpoints((prev) => prev.map((p, i) => (i === index ? { ...p, categoryId } : p)));
  };

  // Search Store & handle Multiple Branch Results (2-Tier Algorithm)
  const handleSearchAndPinStore = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = typeof customQuery === "string" ? customQuery : searchStoreInput;
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Type a store name to search for.");
      return;
    }
    if (pinpoints.length >= 3) {
      notifyMaxPinpoints();
      return;
    }
    setSearchStoreInput(trimmed);
    setIsSearchingStore(true);
    setSearchResults([]);

    // TIER 1: Search Database Verified Places (Pre-recorded Ground Truth)
    try {
      const dbRes = await apiClient.get(`/places?search=${encodeURIComponent(trimmed)}`);
      const dbPlaces: any[] = dbRes.data || [];

      if (dbPlaces.length > 1) {
        // This is the path that fires when a chain has more than one branch in
        // the catalogue — searching "Jollibee" in Tacurong returns both. Carry
        // each result's catalogue identity through so picking the Drive-Thru
        // records the Drive-Thru, not just a coordinate that looks like it.
        const mappedDbResults = dbPlaces.map((p) => ({
          name: p.name,
          formatted_address: p.address + (p.barangay ? `, Brgy. ${p.barangay}` : ""),
          categoryName: p.category?.name,
          geometry: { location: { lat: () => p.latitude, lng: () => p.longitude } },
          isVerifiedDb: true,
          placeId: p.id,
          categoryId: p.categoryId ?? null,
        }));
        setSearchResults(mappedDbResults);
        setIsSearchingStore(false);
        return;
      }

      if (dbPlaces.length === 1) {
        const item = dbPlaces[0];
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        // Keep the catalogue identity, not just the label. This is a
        // VerifiedPlace the dispatcher chose, and its id and category were being
        // dropped here — costing the ETA its per-category dwell allowance and
        // leaving the server unable to tell that a rider went to a different
        // branch of the same chain. Google Places results below have no
        // catalogue entry and correctly carry neither.
        setPinpoints((prev) => [
          ...prev,
          {
            storeName: item.name,
            latitude: lat,
            longitude: lng,
            placeId: item.id,
            categoryId: item.categoryId ?? null,
          },
        ]);
        setSearchStoreInput("");
        setIsSearchingStore(false);

        if (googleMapInstance.current) {
          googleMapInstance.current.panTo({ lat, lng });
          googleMapInstance.current.setZoom(16);
        }
        return;
      }
    } catch (err) {
      console.warn("Database place search query warning:", err);
    }

    // TIER 2: Search via Google Places API (findPlaceFromQuery & textSearch with location bias)
    try {
      const g = (window as any).google;
      const tacurongLatLng = new g.maps.LatLng(6.671, 124.6644);

      if (g && g.maps && g.maps.places && googleMapInstance.current) {
        const placesService = new g.maps.places.PlacesService(googleMapInstance.current);

        // Strictly bound search to Tacurong City
        // Shared with the OSM clip the routing graph is built from - see
        // src/constants/serviceArea.ts.
        const tacurongBounds = new g.maps.LatLngBounds(
          new g.maps.LatLng(SERVICE_AREA_BOUNDS.south, SERVICE_AREA_BOUNDS.west),
          new g.maps.LatLng(SERVICE_AREA_BOUNDS.north, SERVICE_AREA_BOUNDS.east)
        );

        const request = {
          query: `${trimmed} Tacurong City`,
          location: tacurongLatLng,
          radius: 7000, // 7km strict radius for Tacurong City proper
          bounds: tacurongBounds,
        };

        placesService.textSearch(request, (results: any, status: any) => {
          setIsSearchingStore(false);

          if (status === g.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            // Strictly filter results that are within Tacurong City
            const tacurongResults = results.filter((p: any) => {
              const addr = (p.formatted_address || p.vicinity || "").toLowerCase();
              const isTacurong = addr.includes("tacurong") || addr.includes("sultan kudarat");
              const isOtherCity = addr.includes("isulan") || addr.includes("koronadal") || addr.includes("esperanza") || addr.includes("marbel");
              if (isOtherCity) return false;

              if (!isTacurong && p.geometry?.location) {
                const lat = typeof p.geometry.location.lat === "function" ? p.geometry.location.lat() : p.geometry.location.lat;
                const lng = typeof p.geometry.location.lng === "function" ? p.geometry.location.lng() : p.geometry.location.lng;
                return tacurongBounds.contains(new g.maps.LatLng(lat, lng));
              }
              return isTacurong;
            });

            if (tacurongResults.length > 0) {
              const mappedResults = tacurongResults.slice(0, 5).map((place: any) => ({
                name: place.name,
                formatted_address: place.formatted_address || place.vicinity || "Tacurong City",
                geometry: place.geometry,
                isPlaceResult: true,
              }));

              if (mappedResults.length > 1) {
                setSearchResults(mappedResults);
              } else {
                const place = mappedResults[0];
                const lat = typeof place.geometry.location.lat === "function" ? place.geometry.location.lat() : place.geometry.location.lat;
                const lng = typeof place.geometry.location.lng === "function" ? place.geometry.location.lng() : place.geometry.location.lng;
                const storeTitle = place.name;

                setPinpoints((prev) => [...prev, { storeName: storeTitle, latitude: lat, longitude: lng }]);
                setSearchStoreInput("");

                if (googleMapInstance.current) {
                  googleMapInstance.current.panTo({ lat, lng });
                  googleMapInstance.current.setZoom(16);
                }
              }
              return;
            }
          }

          // Fallback to Geocoder strictly restricted to Tacurong City
          if (g.maps.Geocoder) {
            const geocoder = new g.maps.Geocoder();
            const searchAddress = `${trimmed}, Tacurong City, Sultan Kudarat, Philippines`;

            geocoder.geocode(
              {
                address: searchAddress,
                bounds: tacurongBounds,
                componentRestrictions: { country: "PH" },
              },
              (geoResults: any, geoStatus: any) => {
                if (geoStatus === "OK" && geoResults && geoResults.length > 0) {
                  const filteredGeo = geoResults.filter((r: any) => {
                    const addr = (r.formatted_address || "").toLowerCase();
                    const isOtherCity = addr.includes("isulan") || addr.includes("koronadal") || addr.includes("esperanza") || addr.includes("marbel");
                    if (isOtherCity) return false;
                    return addr.includes("tacurong") || addr.includes("sultan kudarat");
                  });

                  if (filteredGeo.length > 1) {
                    setSearchResults(filteredGeo.slice(0, 5));
                  } else if (filteredGeo.length === 1) {
                    const loc = filteredGeo[0].geometry.location;
                    const lat = loc.lat();
                    const lng = loc.lng();
                    const streetName = filteredGeo[0].formatted_address?.split(",")[0] || "Branch";
                    const storeTitle = `${trimmed} (${streetName})`;

                    setPinpoints((prev) => [...prev, { storeName: storeTitle, latitude: lat, longitude: lng }]);
                    setSearchStoreInput("");

                    if (googleMapInstance.current) {
                      googleMapInstance.current.panTo({ lat, lng });
                      googleMapInstance.current.setZoom(16);
                    }
                  } else {
                    toast.error(`Couldn't find "${trimmed}" in Tacurong City. Check the spelling, or click the map to drop a pin.`);
                  }
                } else {
                  toast.error(`Couldn't find "${trimmed}" in Tacurong City. Check the spelling, or click the map to drop a pin.`);
                }
              }
            );
          } else {
            toast.error(`Couldn't find "${trimmed}". Click the map to drop a pin.`);
          }
        });
      } else if (g && g.maps && g.maps.Geocoder) {
        const geocoder = new g.maps.Geocoder();
        const searchAddress = `${trimmed}, Tacurong City, Sultan Kudarat, Philippines`;

        geocoder.geocode(
          {
            address: searchAddress,
            componentRestrictions: { country: "PH" },
          },
          (results: any, status: any) => {
            setIsSearchingStore(false);
            if (status === "OK" && results && results.length > 0) {
              if (results.length > 1) {
                setSearchResults(results.slice(0, 5));
              } else {
                const loc = results[0].geometry.location;
                const lat = loc.lat();
                const lng = loc.lng();
                const storeTitle = `${trimmed} (${results[0].formatted_address?.split(",")[0] || "Branch"})`;
                setPinpoints((prev) => [...prev, { storeName: storeTitle, latitude: lat, longitude: lng }]);
                setSearchStoreInput("");

                if (googleMapInstance.current) {
                  googleMapInstance.current.panTo({ lat, lng });
                  googleMapInstance.current.setZoom(16);
                }
              }
            } else {
              toast.error(`Couldn't find "${trimmed}" in Tacurong City. Click the map to drop a pin.`);
            }
          }
        );
      } else {
        setIsSearchingStore(false);
        toast.info("Maps is still loading — try again in a moment.");
      }
    } catch (err) {
      console.warn("Place search failed:", err);
      setIsSearchingStore(false);
      toast.error(`Couldn't find "${trimmed}". Click the map to drop a pin.`);
    }
  };

  const handleSelectPlaceResult = (result: any) => {
    if (pinpoints.length >= 3) {
      notifyMaxPinpoints();
      return;
    }

    const loc = result.geometry.location;
    const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
    const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);

    const fullAddr = result.formatted_address || "";
    const streetName = fullAddr.split(",")[0] || searchStoreInput;
    const branchTitle = result.name || `${searchStoreInput} (${streetName})`;

    // Present on catalogue results, absent on Google Places ones — which is the
    // honest distinction: a Google result has no entry in our catalogue to point
    // at, and the server treats a stop without a placeId as uncomparable rather
    // than guessing.
    setPinpoints((prev) => [
      ...prev,
      {
        storeName: branchTitle,
        latitude: lat,
        longitude: lng,
        placeId: result.placeId ?? null,
        categoryId: result.categoryId ?? null,
      },
    ]);
    setSearchStoreInput("");
    setSearchResults([]);

    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat, lng });
      googleMapInstance.current.setZoom(16);
    }
  };

  const handleHoverPlaceResult = (result: any) => {
    if (googleMapInstance.current && result && result.geometry?.location) {
      const loc = result.geometry.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
      const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        googleMapInstance.current.panTo({ lat, lng });
        googleMapInstance.current.setZoom(16);
      }
    }
  };

  const handleFocusPinpoint = (pin: StorePinpoint) => {
    if (activeStepView !== 1 && activeStepView !== "ALL") {
      setActiveStepView(1);
    }
    setTimeout(() => {
      if (googleMapInstance.current) {
        const lat = parseFloat(String(pin.latitude));
        const lng = parseFloat(String(pin.longitude));
        if (!isNaN(lat) && !isNaN(lng)) {
          if ((window as any).google?.maps?.event) {
            (window as any).google.maps.event.trigger(googleMapInstance.current, "resize");
          }
          googleMapInstance.current.panTo({ lat, lng });
          googleMapInstance.current.setZoom(16);
        }
      }
    }, 150);
  };

  const handleSaveAndSendMap = async () => {
    setIsSavingPins(true);
    pinFeedback.dismiss();
    try {
      const storesList = pinpoints.map((p) => p.storeName).join(", ");
      const sanitizedPinpoints = pinpoints
        .map((p) => ({
          storeName: p.storeName || "Store",
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          // The last place these were being dropped. Sending them is what gives
          // the ETA a per-category dwell allowance instead of the generic
          // 20-minute default, and what lets the server notice a rider at the
          // wrong branch. Null for a pin dropped outside the catalogue.
          placeId: p.placeId ?? null,
          categoryId: p.categoryId ?? null,
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      // The server recalculates the fee as part of saving pinpoints (distance
      // is now known) and returns the priced errand in the same response —
      // apply it here so the breakdown panel updates immediately. Without
      // this, `orderDetails` stayed on its stale fetch-on-mount copy until
      // the dispatcher reloaded the page, at which point the fee they'd been
      // looking at all along quietly turned out to be wrong.
      const res = await apiClient.post(`/errands/${orderId}/pinpoints`, { pinpoints: sanitizedPinpoints });
      setOrderDetails(res.data?.errand || res.data);

      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "pinpoints",
        text: `I've set the store locations for your errand: ${storesList || "stores updated"}. You can see them on the map in your app.`,
        pinpoints: sanitizedPinpoints,
        timestamp: Date.now(),
      });

      pinFeedback.showSuccess("Store pinpoints saved and sent to the customer.");
    } catch (err) {
      console.error("Failed to save store pinpoints:", err);
      pinFeedback.showError("Couldn't save the store pinpoints. Try again.");
    } finally {
      setIsSavingPins(false);
    }
  };

  const handleStartEditItems = () => {
    const existing = (orderDetails?.pabiliDetails && orderDetails.pabiliDetails.length > 0)
      ? orderDetails.pabiliDetails
      : (orderDetails?.pabiliItemRequests || []);
    setEditableItems(
      existing.map((d: any) => ({
        itemName: d.itemName,
        storeCategory: d.storeCategory || undefined,
        quantity: d.quantity || 1,
      }))
    );
    setIsEditingItems(true);
  };

  // -------------------------------------------------------------------------
  // 4-TIER HIERARCHY HELPERS: Store Pinpoint > Merchant Category > Item > Qty
  // -------------------------------------------------------------------------
  // A pin categorized in Step 1 IS that category — a Jollibee pinned as Fast
  // Food doesn't stop being Fast Food when an item gets filed under it here.
  // These read that categoryId back out so Step 2 can default to it instead
  // of asking the dispatcher to re-decide something Step 1 already recorded.
  const pinIndexFromStoreLabel = (label: string): number => {
    const match = /^Store (\d+)/.exec(label || "");
    return match ? Number(match[1]) - 1 : -1;
  };

  const categoryNameForPin = (pin?: StorePinpoint | null): string | null => {
    if (!pin?.categoryId) return null;
    return merchantCategories.find((c) => c.id === pin.categoryId)?.name ?? null;
  };

  const categoryNameForStoreLabel = (label: string): string | null =>
    categoryNameForPin(pinpoints[pinIndexFromStoreLabel(label)]);

  const parseItemStoreAndCat = (rawCategory?: string) => {
    const defaultStore = pinpoints[0]
      ? `Store 1 - ${(pinpoints[0].storeName || "Store 1").replace(/[.#$/[\]]/g, " ").trim()}`
      : "Store 1";
    const defaultMerchant =
      categoryNameForPin(pinpoints[0]) || merchantCategories[0]?.name || "Fast Food & Restaurant";

    if (!rawCategory) return { store: defaultStore, category: defaultMerchant };

    if (rawCategory.includes(" | ")) {
      const parts = rawCategory.split(" | ");
      return {
        store: parts[0]?.trim() || defaultStore,
        category: parts[1]?.trim() || defaultMerchant,
      };
    }

    const isMerchant = merchantCategories.some(
      (c) => c.name.toLowerCase() === rawCategory.toLowerCase()
    );
    if (isMerchant) {
      return { store: defaultStore, category: rawCategory };
    }

    return { store: rawCategory, category: defaultMerchant };
  };

  const formatItemStoreAndCat = (storeName: string, catName: string) => {
    const cleanStore = (storeName || "Store 1").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();
    const cleanCat = (catName || "General").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim();
    return `${cleanStore} | ${cleanCat}`;
  };

  const handleAddEditableItem = (storeName?: string, catName?: string) => {
    const defaultStore = storeName || (pinpoints[0] ? `Store 1 - ${(pinpoints[0].storeName || "Store 1").replace(/[.#$/[\]]/g, ' ').trim()}` : "Store 1");
    const defaultCat =
      catName || categoryNameForPin(pinpoints[0]) || merchantCategories[0]?.name || "Fast Food & Restaurant";
    setEditableItems((prev) => [
      ...prev,
      { itemName: "", quantity: 1, storeCategory: formatItemStoreAndCat(defaultStore, defaultCat) },
    ]);
  };

  const handleAddEditableItemToStoreAndCategory = (storeName: string, catName: string) => {
    setEditableItems((prev) => [
      ...prev,
      {
        itemName: "",
        quantity: 1,
        storeCategory: formatItemStoreAndCat(storeName, catName),
      },
    ]);
  };

  const handleBatchChangeStoreCategory = (oldStore: string, oldCat: string, newStore: string, newCat: string) => {
    setEditableItems((prev) =>
      prev.map((it) => {
        const { store, category } = parseItemStoreAndCat(it.storeCategory);
        if (store === oldStore && category === oldCat) {
          return { ...it, storeCategory: formatItemStoreAndCat(newStore, newCat) };
        }
        return it;
      })
    );
  };

  const handleRemoveEditableItem = (index: number) => {
    const itemToRemove = editableItems[index];
    const itemName = (itemToRemove?.itemName || "").trim();
    const itemQty = itemToRemove?.quantity || 1;
    const { store, category } = parseItemStoreAndCat(itemToRemove?.storeCategory);

    // 1. Remove from local editable state
    setEditableItems((prev) => prev.filter((_, i) => i !== index));

    // 2. If the item had a named label and orderId exists, notify customer live via chat
    if (itemName && orderId) {
      try {
        const messagesRef = ref(database, `chats/${orderId}/messages`);
        push(messagesRef, {
          senderId: String(dispatcher?.id || "dispatcher-1"),
          senderName: dispatcherFirstName,
          role: "dispatcher",
          type: "item_deleted",
          text: `The item "${itemName}" (Qty: ${itemQty}) from ${store} (${category}) was removed from your order checklist by Dispatcher ${dispatcherFirstName}.`,
          timestamp: Date.now(),
        });

        itemsFeedback.showSuccess(`"${itemName}" removed — the customer was notified in chat.`);
      } catch (err) {
        console.error("Failed to send item deletion notification:", err);
        itemsFeedback.showError(`"${itemName}" was removed, but the customer couldn't be notified.`);
      }
    }
  };

  const handleCancelEditItems = () => {
    setIsEditingItems(false);
    setEditableItems([]);
  };

  const handleSaveItemsAndSendConfirmationCard = async () => {
    const rawItems = isEditingItems && editableItems.length > 0
      ? editableItems
      : ((orderDetails?.pabiliDetails && orderDetails.pabiliDetails.length > 0)
          ? orderDetails.pabiliDetails
          : (orderDetails?.pabiliItemRequests || []));

    const defaultStoreName = pinpoints[0]?.storeName
      ? `Store 1 - ${pinpoints[0].storeName}`
      : "Store 1";

    const sanitized = rawItems
      .map((it: any) => {
        const rawCategory = it.storeCategory || defaultStoreName;
        // Clean out illegal Firebase RTDB key characters: ., #, $, /, [, ]
        const cleanCategory = rawCategory.replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim() || "Store 1";
        return {
          itemName: (it.itemName || "").trim(),
          storeCategory: cleanCategory,
          quantity: Math.max(1, Number(it.quantity) || 1),
        };
      })
      .filter((it: any) => it.itemName.length > 0);

    if (sanitized.length === 0) {
      toast.error("Add at least one item before sending the checklist to the customer.");
      return;
    }

    setIsSavingItems(true);
    try {
      const res = await apiClient.patch(`/errands/${orderId}/items`, { items: sanitized });
      const updatedErrand = res.data?.errand || res.data;
      setOrderDetails(updatedErrand);
      setIsEditingItems(false);

      // Build structured nested tree: Store Pinpoint -> Merchant Category -> Items
      const nestedGrouped: Record<string, Record<string, any[]>> = {};

      sanitized.forEach((it) => {
        const { store, category } = parseItemStoreAndCat(it.storeCategory);
        const cleanStore = store.replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim() || "Store 1";
        const cleanCat = category.replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim() || "General";

        if (!nestedGrouped[cleanStore]) nestedGrouped[cleanStore] = {};
        if (!nestedGrouped[cleanStore][cleanCat]) nestedGrouped[cleanStore][cleanCat] = [];

        nestedGrouped[cleanStore][cleanCat].push({
          itemName: it.itemName,
          quantity: it.quantity,
          priceNote: "Actual store receipt upon purchase",
        });
      });

      const flatStoreGroups: Array<{ storeName: string; items: any[] }> = [];
      Object.keys(nestedGrouped).forEach((st) => {
        const allItemsForStore: any[] = [];
        Object.keys(nestedGrouped[st]).forEach((cat) => {
          allItemsForStore.push(...nestedGrouped[st][cat]);
        });
        flatStoreGroups.push({
          storeName: st,
          items: allItemsForStore,
        });
      });

      const sanitizedPinpoints = pinpoints
        .map((p) => ({
          storeName: (p.storeName || "Store").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim(),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      const deliveryFee = Number(updatedErrand?.deliveryFee || orderDetails?.deliveryFee || 50);
      const totalCost = Number(updatedErrand?.totalCost || orderDetails?.totalCost || 50);

      // Push structured Order Confirmation Card to customer live chat with 4-tier nesting
      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "order_confirmation",
        text: "Here's your order breakdown and delivery fee — please review and approve.",
        pinpoints: sanitizedPinpoints,
        items: sanitized,
        groupedItems: nestedGrouped,
        storeGroups: flatStoreGroups,
        deliveryFee,
        totalCost,
        confirmed: false,
        timestamp: Date.now(),
      });

      setHasSentConfirmationCard(true);
      itemsFeedback.showSuccess("Checklist saved — the order breakdown was sent to the customer.");
    } catch (err: any) {
      console.error("Failed to save updated items:", err);
      itemsFeedback.showError(
        err.response?.data?.message || err.response?.data?.error || "Couldn't save the updated items. Try again."
      );
    } finally {
      setIsSavingItems(false);
    }
  };

  // Confirmation lives at the trigger site (a Dialog, not window.confirm) —
  // this function is the action itself.
  const handleCloseChatPassingBy = async () => {
    try {
      await apiClient.patch(`/errands/${orderId}/status`, { status: "PASSING BY" });
      if (onRefreshOrders) onRefreshOrders();
    } catch (e) {
      console.error("Failed to close errand as passing by:", e);
    }
    onClose();
  };

  // Stepper milestone status calculation (Hick's Law / Cognitive Guidance)
  const hasItems = Boolean(orderDetails?.pabiliDetails?.length || orderDetails?.pabiliItemRequests?.length);
  const hasPins = pinpoints.length > 0;
  const isPaymentConfirmed = Boolean(confirmedPaymentMode);
  const canAssignRider = hasItems && hasPins && isCustomerConfirmed && isPaymentConfirmed;

  const handleAssignRiderNow = async () => {
    if (!canAssignRider) {
      toast.error("Finish the earlier steps first — items, store pins, customer approval, and payment.");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await apiClient.post(`/errands/${orderId}/assign-rider`, {});
      const errandData = res.data?.errand || res.data;
      const assignedRider = errandData?.rider;
      const riderName = assignedRider?.name || (assignedRider?.firstName ? `${assignedRider.firstName} ${assignedRider.lastName || ""}`.trim() : "Rider");

      toast.success(`${riderName} is assigned to order #${formatErrandId(orderId)}.`);

      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "rider_assigned",
        text: `Your rider, ${riderName}, has been assigned and is on the way.`,
        timestamp: Date.now(),
      });

      if (onRefreshOrders) onRefreshOrders();
      onClose();
    } catch (err: any) {
      console.error("Failed to assign rider:", err);
      // A raw HTTP status string ("Request failed with status code 404") is
      // meaningless to a dispatcher — the server's own message wins when it
      // has one, otherwise this is a plain sentence, never err.message itself.
      const errorMsg = err.response?.data?.message || "Couldn't assign a rider right now — try again in a moment.";
      toast.error(errorMsg);
    } finally {
      setIsAssigning(false);
    }
  };

  if (panelError) {
    return (
      <UnauthorizedErrandScreen
        errandId={orderId}
        variant={panelError.variant}
        claimantName={panelError.claimantName}
        reason={panelError.reason}
        onReturnToQueue={onClose}
        onViewMyErrands={onClose}
      />
    );
  }

  // Dynamic Step Completion & Progress Tracking (Goal Gradient Effect)
  const step1Done = Boolean(hasPins && hasItems);
  const step2Done = Boolean(isCustomerConfirmed);
  const step3Done = Boolean(isPaymentConfirmed);
  const step4Done = Boolean(canAssignRider);
  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const workflowProgressPct = Math.round((completedStepsCount / 4) * 100);

  const customerPhoneNumber = orderDetails?.customer?.phone || orderDetails?.customerPhone || "";
  const customerDisplayName = orderDetails?.customer?.name || orderDetails?.customerName || "Customer User";

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-slate-100 overflow-hidden animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE CONSOLE HEADER (Mission Control)                         */}
      {/* ========================================================================= */}
      <header className="bg-dispatcher-navy-dark text-white px-5 sm:px-6 py-3 flex items-center justify-between shadow-md shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center font-bold text-white shadow-inner shrink-0">
            <Compass size={22} className="text-blue-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-sm sm:text-base text-white tracking-wide">
                {isReadOnly ? "Closed Conversation" : "Order Chat"}
              </h2>

              {/* Order Reference Badge with 1-Click Copy */}
              <button
                type="button"
                onClick={() => handleCopyText(formatErrandId(orderId), "order")}
                className="group flex items-center gap-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-200 hover:text-white text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30 transition cursor-pointer"
                title="Click to copy Order ID"
                aria-label={copiedOrderId ? "Order ID copied" : `Copy order ID ${formatErrandId(orderId)}`}
              >
                <span>#{formatErrandId(orderId)}</span>
                {copiedOrderId ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} className="opacity-60 group-hover:opacity-100" />
                )}
              </button>

              {/* Live Lifecycle Status */}
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30 shadow-xs">
                {orderDetails?.status || "PENDING"}
              </span>
            </div>

            <p className="text-xs text-blue-200/80 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Customer: <strong className="text-white font-extrabold">{customerDisplayName}</strong></span>
              {customerPhoneNumber && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(customerPhoneNumber, "phone")}
                    className="flex items-center gap-1 text-blue-200 hover:text-white font-mono transition"
                    title="Click to copy phone number"
                    aria-label={copiedPhone ? "Phone number copied" : `Copy phone number ${customerPhoneNumber}`}
                  >
                    <Phone size={11} />
                    <span>{customerPhoneNumber}</span>
                    {copiedPhone && <span className="text-[10px] text-emerald-400 font-bold ml-0.5">Copied!</span>}
                  </button>
                </>
              )}
              <span>•</span>
              <span className="truncate max-w-[280px] sm:max-w-md">Drop-off: <strong className="text-white">{orderDetails?.deliveryAddress || "Tacurong City"}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Tab Switcher */}
          <div className="lg:hidden flex bg-blue-950/60 p-0.5 rounded-lg border border-blue-400/20 text-xs">
            <button
              type="button"
              onClick={() => setMobileActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${mobileActiveTab === "chat" ? "bg-blue-600 text-white" : "text-blue-200"}`}
            >
              <MessageSquare size={13} /> Chat
            </button>
            <button
              type="button"
              onClick={() => setMobileActiveTab("tools")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${mobileActiveTab === "tools" ? "bg-blue-600 text-white" : "text-blue-200"}`}
            >
              <SlidersHorizontal size={13} /> Tools {pinpoints.length > 0 && `(${pinpoints.length})`}
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer border border-white/15 active:scale-95"
            title="Close operations console"
            aria-label="Close operations console"
          >
            <X size={16} />
            <span className="hidden sm:inline">Exit Chat</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. GOAL-GRADIENT 4-STEP DISPATCH PIPELINE TRACKER                         */}
      {/* ========================================================================= */}
      {!isReadOnly && (
        <div className="bg-white border-b border-slate-200 shadow-2xs shrink-0">
          <div className="px-5 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-0.5 flex-1">
              {/* Destructive / Close Transaction Action (Physically isolated on the far left) */}
              <button
                onClick={() => setShowPassByConfirm(true)}
                className="text-rose-700 hover:text-rose-900 font-bold text-xs flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer shrink-0 shadow-2xs hover:shadow-xs"
                title="Close chat without creating an order"
              >
                Click to End Chat
              </button>

              <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                STEPS:
              </span>

              {/* Step 1 Button Capsule */}
              <button
                type="button"
                onClick={() => setActiveStepView(1)}
                aria-current={activeStepView === 1 ? "step" : undefined}
                className={`group flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 border shrink-0 cursor-pointer active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                  activeStepView === 1
                    ? "ring-2 ring-dispatcher-navy shadow-xs border-dispatcher-navy"
                    : ""
                } ${
                  step1Done
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-950"
                    : "bg-blue-50 text-blue-900 border-blue-200 ring-1 ring-blue-500/20 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-950"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white group-hover:scale-110 transition-transform ${
                    step1Done ? "bg-emerald-600" : "bg-blue-600"
                  }`}
                >
                  {step1Done ? "✓" : "1"}
                </span>
                <span>1. Stores Pinned ({pinpoints.length}/3)</span>
              </button>

              <ChevronRight size={13} className="text-slate-300 shrink-0" />

              {/* Step 2 Button Capsule */}
              <button
                type="button"
                onClick={() => setActiveStepView(2)}
                aria-current={activeStepView === 2 ? "step" : undefined}
                className={`group flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 border shrink-0 cursor-pointer active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                  activeStepView === 2
                    ? "ring-2 ring-dispatcher-navy shadow-xs border-dispatcher-navy"
                    : ""
                } ${
                  step2Done
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-950"
                    : hasSentConfirmationCard
                    ? "bg-amber-50 text-amber-900 border-amber-200 ring-1 ring-amber-500/20 hover:bg-amber-100 hover:border-amber-300 hover:text-amber-950"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white group-hover:scale-110 transition-transform ${
                    step2Done ? "bg-emerald-600" : hasSentConfirmationCard ? "bg-amber-500" : "bg-slate-400"
                  }`}
                >
                  {step2Done ? "✓" : "2"}
                </span>
                <span>
                  2. Confirmation ({step2Done ? "Approved" : hasSentConfirmationCard ? "Awaiting customer" : "Pending"})
                </span>
              </button>

              <ChevronRight size={13} className="text-slate-300 shrink-0" />

              {/* Step 3 Button Capsule */}
              <button
                type="button"
                onClick={() => setActiveStepView(3)}
                aria-current={activeStepView === 3 ? "step" : undefined}
                className={`group flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 border shrink-0 cursor-pointer active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                  activeStepView === 3
                    ? "ring-2 ring-dispatcher-navy shadow-xs border-dispatcher-navy"
                    : ""
                } ${
                  step3Done
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:text-emerald-950"
                    : isPaymentEnabled
                    ? "bg-blue-50 text-blue-900 border-blue-200 ring-1 ring-blue-500/20 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-950"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white group-hover:scale-110 transition-transform ${
                    step3Done ? "bg-emerald-600" : isPaymentEnabled ? "bg-blue-600" : "bg-slate-400"
                  }`}
                >
                  {step3Done ? "✓" : "3"}
                </span>
                <span>
                  3. Payment ({step3Done ? "Verified" : isPaymentEnabled ? "Prompted" : "Pending"})
                </span>
              </button>

              <ChevronRight size={13} className="text-slate-300 shrink-0" />

              {/* Step 4 Button Capsule */}
              <button
                type="button"
                onClick={() => setActiveStepView(4)}
                aria-current={activeStepView === 4 ? "step" : undefined}
                className={`group flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 border shrink-0 cursor-pointer active:scale-95 hover:-translate-y-0.5 hover:shadow-sm ${
                  activeStepView === 4
                    ? "ring-2 ring-emerald-600 shadow-xs border-emerald-600"
                    : ""
                } ${
                  step4Done
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs hover:bg-emerald-700 hover:border-emerald-800 animate-pulse"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/80 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform ${
                    step4Done ? "bg-white text-emerald-700" : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {step4Done ? "🚀" : "4"}
                </span>
                <span>4. Assign Rider ({step4Done ? "Ready to dispatch" : "Locked"})</span>
              </button>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-extrabold text-slate-600">
                {completedStepsCount}/4 Steps Complete ({workflowProgressPct}%)
              </span>
            </div>
          </div>

          {/* Goal-Gradient Animated Progress Bar */}
          <div className="w-full bg-slate-100 h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(8, workflowProgressPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DUAL-PANE MAIN WORKSPACE CONTAINER (RESIZABLE SPLIT PANE)              */}
      {/* ========================================================================= */}
      <div
        ref={splitWorkspaceRef}
        style={{
          "--chat-width": `${chatWidthPercent}%`,
          "--tools-width": `${100 - chatWidthPercent}%`,
        } as React.CSSProperties}
        className="flex-1 flex overflow-hidden relative"
      >
        {/* ======================================================================= */}
        {/* LEFT COLUMN: LIVE CUSTOMER CHAT FEED                                    */}
        {/* ======================================================================= */}
        <div
          className={`w-full lg:w-[var(--chat-width)] border-r border-slate-200 flex flex-col bg-white shrink-0 ${
            mobileActiveTab === "chat" ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Customer Live Header Sub-Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                {customerDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-800 truncate text-xs">{customerDisplayName}</p>
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Customer Live in Chat</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <span className="bg-slate-200/80 px-2 py-0.5 rounded font-bold text-slate-700">
                {messages.length} msgs
              </span>
            </div>
          </div>

          {/* Live Chat Message Feed */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span>Loading chat transcript...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <MessageSquare size={28} />
                </div>
                <p className="text-sm font-extrabold text-slate-800">No messages yet</p>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Send a message or use a quick reply below to get started.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  isCurrentUser={m.role === "dispatcher"}
                  currentUserFirstName={dispatcherFirstName}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Quick Reply Chips (Sub-3-second reassurance) */}
          {!isReadOnly && (
            <div className="px-3.5 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Quick replies:</span>
              {[
                "I'm reviewing your order now.",
                "I've pinned the store on the map — take a look.",
                "I've sent your order breakdown — please approve it when ready.",
                "Your Cash on Delivery payment is confirmed.",
                "I'm assigning your rider now.",
                "Your rider has accepted and is heading to the store.",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(chip)}
                  className="bg-white hover:bg-blue-50 hover:text-blue-900 hover:border-blue-300 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-medium shrink-0 shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Form */}
          {isReadOnly ? (
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
              <Lock size={13} />
              <span>This conversation is closed. You can read it, but you can't send new messages.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type message to customer (Enter to send)..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-dispatcher-navy/20 focus:border-dispatcher-navy transition"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-dispatcher-navy hover:bg-dispatcher-navy-dark disabled:bg-slate-200 disabled:text-slate-400 text-white pl-4 pr-3.5 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer font-bold text-sm"
                title="Send message"
                aria-label="Send message"
              >
                <span className="hidden sm:inline">Send</span>
                <Send size={16} />
              </button>
            </form>
          )}
        </div>

        {/* ======================================================================= */}
        {/* VERTICAL DRAGGABLE SPLITTER / RESIZER (DESKTOP ONLY)                     */}
        {/* ======================================================================= */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSplitter(true);
            setShowResizeTooltip(true);
          }}
          onMouseEnter={() => setShowResizeTooltip(true)}
          onMouseLeave={() => {
            if (!isDraggingSplitter) setShowResizeTooltip(false);
          }}
          onDoubleClick={() => {
            setChatWidthPercent(40);
            try {
              localStorage.setItem("sugo_dispatcher_chat_split_width", "40");
            } catch {}
          }}
          title="Drag to resize panels (Double-click to reset 40/60)"
          className={`hidden lg:flex items-center justify-center relative z-20 cursor-col-resize select-none shrink-0 group transition-colors ${
            isDraggingSplitter
              ? "w-2 bg-blue-600 shadow-md"
              : "w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-500 active:bg-blue-600"
          }`}
        >
          {/* Centered Drag Pill Handle & Resize Tooltip (matching uploaded image) */}
          <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
            {/* Small Pill Grip Handle */}
            <div
              className={`w-3.5 h-7 rounded-full border shadow-2xs flex items-center justify-center transition-all ${
                isDraggingSplitter
                  ? "bg-blue-600 border-blue-700 text-white scale-110 shadow-sm"
                  : "bg-white border-slate-300 text-slate-400 group-hover:border-blue-400 group-hover:text-blue-600 group-hover:scale-105"
              }`}
            >
              <GripVertical size={10} strokeWidth={2.5} />
            </div>

            {/* "Resize" Tooltip Pill (matching uploaded image) */}
            {(isDraggingSplitter || showResizeTooltip) && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap animate-fade-in pointer-events-none select-none flex items-center gap-1">
                <span>Resize</span>
                <span className="text-[9px] text-blue-300 font-mono">({Math.round(chatWidthPercent)}%)</span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: DISPATCHER MISSION CONTROL TOOLS                          */}
        {/* ======================================================================= */}
        <div
          className={`w-full lg:w-[var(--tools-width)] flex flex-col bg-slate-50/80 overflow-y-auto ${
            mobileActiveTab === "tools" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="p-5 sm:p-6 lg:p-8 2xl:p-10 space-y-6 lg:space-y-8 text-xs max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto w-full">
            
            {/* ------------------------------------------------------------------- */}
            {/* COCKPIT STATUS & PROGRESSIVE DISCLOSURE VIEW MODE BAR               */}
            {/* ------------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dispatcher-navy text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                  <SlidersHorizontal size={20} className="text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-900 font-extrabold text-sm tracking-wide">
                      Order Setup
                    </h3>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      {completedStepsCount}/4 Complete
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {completedStepsCount === 4 ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={13} /> All pipeline steps verified. Errand ready for rider dispatch!
                      </span>
                    ) : (
                      <span>
                        Current active milestone: <strong className="text-slate-700">Step {!step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* View Mode Selector: Focus Mode vs All Steps */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0 self-stretch sm:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setActiveStepView("ALL")}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    activeStepView === "ALL"
                      ? "bg-white text-dispatcher-navy shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers size={13} />
                  <span>Overview (All)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepView(!step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    activeStepView !== "ALL"
                      ? "bg-dispatcher-navy text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Focus size={13} />
                  <span>Focus Step {activeStepView !== "ALL" ? `#${activeStepView}` : ""}</span>
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* STEP CARD 1: STORE MAP PINPOINTING & GIS ROUTING                    */}
            {/* ------------------------------------------------------------------- */}
            {activeStepView !== "ALL" && activeStepView !== 1 && (
              <button
                type="button"
                onClick={() => setActiveStepView(1)}
                className="w-full text-left bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${step1Done ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                    {step1Done ? "✓" : "1"}
                  </span>
                  <div>
                    <p className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                      <span>Step 1: Store Locations</span>
                      {step1Done ? (
                        <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {pinpoints.length} stores pinned
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Needs pinning
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Base fare {rateConfig ? formatPeso(Number(rateConfig.baseFee)) : "—"} • {pinpoints.length > 0 ? pinpoints.map(p => p.storeName).join(", ") : "No pins set"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 flex items-center gap-1">
                  <span>View / Edit Map</span>
                  <ChevronRight size={14} />
                </span>
              </button>
            )}

          <div className={activeStepView !== "ALL" && activeStepView !== 1 ? "hidden" : "bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                  Step 1 of 4
                </span>
                <h3 className="text-slate-900 font-extrabold text-sm lg:text-base flex items-center gap-2">
                  <MapPin size={16} className="text-red-600" />
                  <span>Store Locations</span>
                </h3>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                  step1Done
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {pinpoints.length}/3 Stores Pinned {step1Done && "✓"}
              </span>
            </div>

            {/* Map (left) + Search/Pin action column (right) — lg:+ two-zone grid; stacked map-then-form below lg: */}
            <div
              className={
                isReadOnly
                  ? ""
                  : "grid grid-cols-1 lg:grid-cols-[1fr_20rem] lg:gap-5 lg:items-stretch"
              }
            >
              {/* Embedded Google Maps Container */}
              <div className="w-full h-60 sm:h-72 lg:h-80 xl:h-96 2xl:h-[28rem] rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
                <div ref={mapRef} className="w-full h-full" />
                {!isMapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading Google Maps...
                  </div>
                )}
                <div
                  className={`absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs p-2 text-[10px] text-slate-700 text-center rounded-lg border border-slate-200/80 shadow-xs font-medium flex items-center justify-center gap-1.5 ${
                    !isReadOnly ? "lg:hidden" : ""
                  }`}
                >
                  <span>Click the map to drop a pin, or search for a store below.</span>
                </div>
              </div>

              {/* Store Search Form (2-Tier POI Engine) */}
              {!isReadOnly && (
                <form
                  onSubmit={handleSearchAndPinStore}
                  className="mt-4 lg:mt-0 flex flex-col gap-2"
                >
                  <p className="hidden lg:block text-[11px] text-slate-500 font-medium leading-snug">
                    Click the map to drop a pin, or search for a store below.
                  </p>

                  <div className="relative flex items-center gap-2 lg:flex-col lg:items-stretch">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search store name (e.g. Jollibee Tacurong, Mercury Drug)..."
                        value={searchStoreInput}
                        onChange={(e) => setSearchStoreInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-dispatcher-navy focus:ring-2 focus:ring-dispatcher-navy/20 transition"
                      />
                      {searchStoreInput && (
                        <button
                          type="button"
                          onClick={() => setSearchStoreInput("")}
                          aria-label="Clear search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <DispatcherButton
                      type="submit"
                      disabled={!searchStoreInput.trim() || isSearchingStore || pinpoints.length >= 3}
                      loading={isSearchingStore}
                      icon={<MapPin size={14} />}
                      className="shrink-0 lg:w-full"
                    >
                      Pin Store
                    </DispatcherButton>
                  </div>

                  {/* Quick POI Shortcut Chips for Tacurong */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs lg:flex-wrap lg:overflow-visible">
                    <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">
                      Quick pin:
                    </span>
                    {QUICK_TACURONG_POIS.map((poi, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSearchAndPinStore(undefined, poi.query)}
                        disabled={isSearchingStore || pinpoints.length >= 3}
                        className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-dispatcher-navy font-bold text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 transition shadow-2xs shrink-0 cursor-pointer active:scale-95 disabled:opacity-40"
                      >
                        {poi.label}
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </div>

            {/* Multi-Branch Store Selection Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-blue-300 rounded-xl p-3 space-y-2 shadow-lg animate-fade-in my-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-black text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Store size={14} />
                    <span>{searchResults.length} branches found — pick one:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchResults([])}
                    aria-label="Close results"
                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-[30vh] lg:max-h-[40vh] overflow-y-auto">
                  {searchResults.map((res, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseEnter={() => handleHoverPlaceResult(res)}
                      onClick={() => handleSelectPlaceResult(res)}
                      className="w-full text-left bg-slate-50 hover:bg-blue-50 text-slate-800 p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 text-xs flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Compass size={13} className="text-blue-600" />
                          <span>{res.name || res.formatted_address?.split(",")[0] || searchStoreInput}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-sm">
                          {res.formatted_address}
                        </p>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded shrink-0 ml-2 border border-blue-200">
                        Tap to pin
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pinpoints List */}
            <div className="space-y-2">
              {pinpoints.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No store pins added yet. Search above or click map directly.
                </p>
              ) : (
                pinpoints.map((pin, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs">{pin.storeName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          Lat: {Number(pin.latitude).toFixed(4)}, Lng: {Number(pin.longitude).toFixed(4)}
                        </p>
                        {isReadOnly ? (
                          pin.categoryId != null && (
                            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              {merchantCategories.find((c) => c.id === pin.categoryId)?.name || "Category set"}
                            </p>
                          )
                        ) : (
                          <select
                            value={pin.categoryId ?? ""}
                            onChange={(e) =>
                              handleSetPinpointCategory(idx, e.target.value ? Number(e.target.value) : null)
                            }
                            // The category is what the handling-fee fallback and the
                            // ETA's per-store dwell allowance both read — set it
                            // explicitly rather than leaving it to a places-search
                            // result that a manually-dropped pin never had.
                            title="Merchant category — used for handling-fee pricing when the customer's own picks don't resolve, and for this stop's expected dwell time"
                            className="mt-1.5 w-full text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 cursor-pointer"
                          >
                            <option value="">No category (generic ETA)</option>
                            {merchantCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFocusPinpoint(pin)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition cursor-pointer"
                        title="Show this store on the map"
                        aria-label={`Show ${pin.storeName} on the map`}
                      >
                        <Target size={15} />
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePinpoint(idx)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition cursor-pointer"
                          title="Remove store pin"
                          aria-label={`Remove ${pin.storeName}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!isReadOnly && (
              <button
                onClick={handleSaveAndSendMap}
                disabled={isSavingPins || pinpoints.length === 0}
                className="w-full bg-dispatcher-navy hover:bg-dispatcher-navy-dark disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xs text-xs cursor-pointer active:scale-95"
              >
                {isSavingPins ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                {isSavingPins ? "Sending..." : "Send Location Map to Customer"}
              </button>
            )}

            {/* The price the customer is about to be shown.
                This used to recompute base, multi-store and distance fees from
                rateConfig — a fourth copy of the pricing formula, missing the
                handling and non-COD components, with a total that fell back to
                the base fee when the errand had none. It now renders the server's
                own breakdown, so the dispatcher confirms the exact figure the
                customer receives rather than a lookalike. */}
            {(() => {
              const fb = (orderDetails as any)?.feeBreakdown;
              if (!fb) {
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-500">
                    Delivery fee is calculated once store pinpoints are saved.
                  </div>
                );
              }
              const row = (label: string, value: number, tone = "text-slate-600") => (
                <div className={`flex items-center justify-between ${tone}`}>
                  <span>{label}</span>
                  <span className="font-mono font-bold text-slate-800">{formatPeso(Number(value))}</span>
                </div>
              );
              // The allowance the base fare covers is a server constant published
              // beside the editable rates, not a number this label gets to
              // assert. It read "First 2.0 km" while the server was on 1.5 km,
              // quietly telling the dispatcher — and the customer they relay it
              // to — the wrong thing. Omits the parenthetical entirely rather
              // than guessing when the config has not loaded.
              const allowanceKm = rateConfig?.pricingRules?.baseFeeDistanceKm;
              const baseFeeLabel =
                typeof allowanceKm === "number"
                  ? `Base Delivery Fee (First ${allowanceKm.toFixed(1)} km):`
                  : "Base Delivery Fee:";
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 font-medium">
                  {row(baseFeeLabel, fb.fees.baseFee)}
                  {fb.fees.distanceFee > 0 && row("Excess Distance Surcharge:", fb.fees.distanceFee, "text-blue-700")}
                  {fb.fees.multiStoreFee > 0 && row("Multi-Store Surcharge:", fb.fees.multiStoreFee, "text-amber-700")}
                  {fb.fees.groceryFee > 0 && row("Purchase Handling Fee:", fb.fees.groceryFee, "text-amber-700")}
                  {fb.fees.nonCodFee > 0 && row("Online Payment Fee:", fb.fees.nonCodFee, "text-blue-700")}

                  {/* Why the Multi-Store row above is bigger than the customer's
                      own checkout selection would predict. They pinned more
                      stores than the customer chose categories, and — since
                      2026-08-31, at Sugo Express's direction — that split is now
                      billed rather than absorbed. An unexplained bigger charge
                      reads as a broken system just as surely as an unexplained
                      missing one did, so this stays even though what it now
                      explains is the opposite of what it used to. */}
                  {fb.extraChargedStores > 0 && (
                    <div
                      className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] font-medium leading-snug text-amber-800"
                      data-testid="dispatcher-extra-charged-stores"
                    >
                      <AlertCircle size={14} className="mt-px shrink-0 text-amber-600" />
                      <span>
                        <span className="font-bold">
                          {fb.extraChargedStores} extra {fb.extraChargedStores === 1 ? "stop" : "stops"} billed.
                        </span>{" "}
                        You pinned more stores than the customer selected at checkout, so the Multi-Store Surcharge
                        above now includes the extra stop(s) — their total moved because of a routing decision they
                        did not make. Consider letting them know before they see the updated total.
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-slate-900 text-xs">
                    <span>Total Delivery Fee:</span>
                    <span className="font-mono text-emerald-700 text-sm" data-testid="dispatcher-fee-subtotal">
                      {formatPeso(Number(fb.fees.subtotal))}
                    </span>
                  </div>

                  {/* The customer's money for the goods, kept out of the fees
                      above — the company fronts it and the rider only carries it. */}
                  {fb.itemsSubtotal > 0 && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Items to be purchased:</span>
                      <span className="font-mono font-bold">{formatPeso(Number(fb.itemsSubtotal))}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-black text-slate-900">
                    <span>Customer pays:</span>
                    <span className="font-mono text-sm" data-testid="dispatcher-grand-total">
                      {formatPeso(Number(fb.grandTotal))}
                    </span>
                  </div>

                  {!fb.isFinal && (
                    <p className="text-[10px] text-amber-700 pt-1">
                      Estimate — the distance fee is set once pinpoints are saved.
                    </p>
                  )}
                </div>
              );
            })()}

            <DispatcherInlineBanner message={pinFeedback.message} onDismiss={pinFeedback.dismiss} />

            {/* Forward navigation — always available, not just in Focus mode, so
                a dispatcher in Overview isn't left with no way to move on. */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStepView(2)}
                className="text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Item Checklist</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* STEP CARD 2: STORE / MERCHANT CATEGORY GROUPED CHECKLIST & MAPPING */}
          {/* ------------------------------------------------------------------- */}
          {orderDetails && (
            <>
              {activeStepView !== "ALL" && activeStepView !== 2 && (
                <button
                  type="button"
                  onClick={() => setActiveStepView(2)}
                  className="w-full text-left bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${step2Done ? "bg-emerald-100 text-emerald-800" : hasSentConfirmationCard ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                      {step2Done ? "✓" : "2"}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        <span>Step 2: Items & Stores</span>
                        {step2Done ? (
                          <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Approved by customer
                          </span>
                        ) : hasSentConfirmationCard ? (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Awaiting customer
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Needs item mapping
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {((orderDetails?.pabiliDetails?.length || orderDetails?.pabiliItemRequests?.length) ?? 0)} items mapped across {pinpoints.length} stores
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 flex items-center gap-1">
                    <span>View / Edit Checklist</span>
                    <ChevronRight size={14} />
                  </span>
                </button>
              )}

              <div className={activeStepView !== "ALL" && activeStepView !== 2 ? "hidden" : "bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                      Step 2 of 4
                    </span>
                    <h3 className="text-slate-900 font-extrabold text-sm lg:text-base flex items-center gap-2">
                      <Package size={16} className="text-dispatcher-navy" />
                      <span>Items & Stores</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {step2Done ? (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Approved by customer
                      </span>
                    ) : hasSentConfirmationCard ? (
                      <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <Clock size={12} /> Awaiting customer
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                        ● Mapping In Progress
                      </span>
                    )}

                    {!isReadOnly && !isEditingItems && (
                      <button
                        onClick={handleStartEditItems}
                        className="flex items-center gap-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer ring-2 ring-blue-600/20 hover:ring-blue-600/40"
                      >
                        <Pencil size={13} strokeWidth={2.5} className="shrink-0" />
                        <span>Edit / Map Items</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2.1 STEP 1 PINPOINTED STORES INTEGRATION BAR */}
                {(() => {
                  const currentItems = (orderDetails.pabiliDetails && orderDetails.pabiliDetails.length > 0)
                    ? orderDetails.pabiliDetails
                    : (orderDetails.pabiliItemRequests || []);
                  const itemsToCount = isEditingItems ? editableItems : currentItems;

                  return (
                    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-emerald-50/80 p-3 rounded-xl border border-blue-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-dispatcher-navy flex items-center gap-1.5">
                          <MapPin size={13} className="text-red-600 animate-pulse" />
                          <span>Stores from Step 1 ({pinpoints.length}/3):</span>
                        </span>
                        {pinpoints.length === 0 ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                            No stores pinned yet
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                            Ready for the rider
                          </span>
                        )}
                      </div>

                      {pinpoints.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-0.5">
                          {pinpoints.map((pin, pIdx) => {
                            const cleanName = (pin.storeName || `Store ${pIdx + 1}`).replace(/[.#$/[\]]/g, ' ').trim();
                            const fullPinKey = `Store ${pIdx + 1} - ${cleanName}`;
                            // Reuses parseItemStoreAndCat rather than a second,
                            // incompatible way of answering "which store is this
                            // item under" — that second heuristic compared a
                            // customer's raw merchant category ("Fast Food &
                            // Restaurant") directly against a "Store N - Name" key,
                            // which can never match, so every unmapped item counted
                            // as 0 everywhere, on every errand, until a dispatcher
                            // opened the editor and re-selected its store by hand.
                            const assignedCount = itemsToCount.filter((it: any) => {
                              return parseItemStoreAndCat(it.storeCategory).store === fullPinKey;
                            }).length;

                            return (
                              <div
                                key={pIdx}
                                className="bg-white/90 rounded-lg p-2 border border-blue-100 shadow-2xs flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                    {pIdx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-slate-800 text-xs truncate">
                                      {pin.storeName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                      {assignedCount} {assignedCount === 1 ? "item mapped" : "items mapped"}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleFocusPinpoint(pin)}
                                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition shrink-0 cursor-pointer"
                                  title="Pan Map to this store"
                                >
                                  <Target size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Pin store locations in Step 1 above so items can be grouped by physical branch for the rider.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* 2.2 STRUCTURED 4-TIER ITEM LIST EDITOR & VIEWER */}
                {(() => {
                  const availableStoreOptions = pinpoints.map(
                    (p, idx) => `Store ${idx + 1} - ${(p.storeName || `Store ${idx + 1}`).replace(/[.#$/[\]]/g, " ").trim()}`
                  );
                  if (availableStoreOptions.length === 0) {
                    availableStoreOptions.push("Store 1");
                  }

                  // Fallback for when the catalogue fetch has not landed. It used
                  // to list six names of which four ("Pharmacy", "Groceries &
                  // Retail", "Bakery", "Beverages", "Personal Care") have never
                  // been real categories — picking one filed the item under a
                  // category the server cannot resolve, costing it its handling
                  // fee mode. These are the four that actually exist.
                  const availableMerchantCategoryOptions = merchantCategories.length > 0
                    ? merchantCategories.map((c) => c.name)
                    : [
                        "Fast Food & Restaurant",
                        "Pharmacy & Health",
                        "Supermarket & Grocery",
                        "Retail & General Merchandise",
                      ];

                  if (isEditingItems) {
                    return (
                      /* EDIT MODE */
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-slate-700 text-xs">
                            Edit Items ({editableItems.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddEditableItem()}
                            className="flex items-center gap-1 bg-dispatcher-navy hover:bg-dispatcher-navy-dark text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            <Plus size={13} /> Add Item Row
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-[45vh] lg:max-h-[55vh] overflow-y-auto pr-1">
                          {editableItems.map((item, idx) => {
                            const { store: currentStore, category: currentCat } = parseItemStoreAndCat(item.storeCategory);
                            const pinnedCat = categoryNameForStoreLabel(currentStore);
                            return (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label htmlFor={`item-store-${idx}`} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                      <MapPin size={10} className="text-red-500" />
                                      <span>1. Store</span>
                                    </label>
                                    <select
                                      id={`item-store-${idx}`}
                                      value={currentStore}
                                      onChange={(e) => {
                                        const newStore = e.target.value;
                                        // If Step 1 gave this store a real category, that's what
                                        // it is — carry it over rather than leaving whatever
                                        // category the PREVIOUS store had selected.
                                        const newStorePinnedCat = categoryNameForStoreLabel(newStore);
                                        setEditableItems((prev) =>
                                          prev.map((it, i) =>
                                            i === idx
                                              ? { ...it, storeCategory: formatItemStoreAndCat(newStore, newStorePinnedCat ?? currentCat) }
                                              : it
                                          )
                                        );
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-dispatcher-navy"
                                    >
                                      {availableStoreOptions.map((storeOpt, sIdx) => (
                                        <option key={sIdx} value={storeOpt}>📍 {storeOpt}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label htmlFor={`item-category-${idx}`} className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                      <Store size={10} className="text-blue-500" />
                                      <span>2. Category</span>
                                      {pinnedCat && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleFocusPinpoint(pinpoints[pinIndexFromStoreLabel(currentStore)])
                                          }
                                          className="normal-case font-medium text-blue-600 hover:text-blue-800 underline decoration-dotted underline-offset-2 cursor-pointer"
                                          title="Jump to this store's pin in Step 1 to change its category"
                                        >
                                          · set by store pin
                                        </button>
                                      )}
                                    </label>
                                    <select
                                      id={`item-category-${idx}`}
                                      // Once the store this item is filed at has its own pinned
                                      // category, that IS the category — a rider standing in a
                                      // Jollibee is buying fast food whatever an item row says.
                                      // Locked rather than merely defaulted, so the two can't be
                                      // talked out of sync again by a later edit here.
                                      value={pinnedCat ?? currentCat}
                                      disabled={!!pinnedCat}
                                      title={pinnedCat ? "Set on the store pin in Step 1 — change it there." : undefined}
                                      onChange={(e) => {
                                        const newCat = e.target.value;
                                        setEditableItems((prev) =>
                                          prev.map((it, i) =>
                                            i === idx ? { ...it, storeCategory: formatItemStoreAndCat(currentStore, newCat) } : it
                                          )
                                        );
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-dispatcher-navy disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                                    >
                                      {availableMerchantCategoryOptions.map((catOpt) => (
                                        <option key={catOpt} value={catOpt}>📁 {catOpt}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    placeholder="Item name..."
                                    aria-label="Item name"
                                    value={item.itemName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditableItems((prev) => prev.map((it, i) => (i === idx ? { ...it, itemName: val } : it)));
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                                  />
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const q = Math.max(1, (Number(item.quantity) || 1) - 1);
                                        setEditableItems((prev) =>
                                          prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                                        );
                                      }}
                                      aria-label="Decrease quantity"
                                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold text-xs px-1.5 text-slate-800 min-w-[20px] text-center">
                                      {item.quantity || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const q = (Number(item.quantity) || 1) + 1;
                                        setEditableItems((prev) =>
                                          prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                                        );
                                      }}
                                      aria-label="Increase quantity"
                                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditableItem(idx)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete item"
                                    aria-label={`Delete ${item.itemName || "item"}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={handleCancelEditItems}
                            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-bold text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveItemsAndSendConfirmationCard}
                            disabled={isSavingItems || editableItems.length === 0}
                            className="bg-dispatcher-navy hover:bg-dispatcher-navy-dark disabled:bg-slate-300 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                          >
                            {isSavingItems ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            <span>Save & Send Card</span>
                          </button>
                        </div>

                        <DispatcherInlineBanner message={itemsFeedback.message} onDismiss={itemsFeedback.dismiss} />
                      </div>
                    );
                  }

                  // VIEW MODE: 4-Tier Tree View
                  const currentItems = (orderDetails.pabiliDetails && orderDetails.pabiliDetails.length > 0)
                    ? orderDetails.pabiliDetails
                    : (orderDetails.pabiliItemRequests || []);

                  const storeTree: Record<string, Record<string, any[]>> = {};

                  availableStoreOptions.forEach((st) => {
                    storeTree[st] = {};
                  });

                  currentItems.forEach((it: any) => {
                    const { store, category } = parseItemStoreAndCat(it.storeCategory);
                    const targetStore = availableStoreOptions.includes(store) ? store : (availableStoreOptions[0] || "Store 1");
                    if (!storeTree[targetStore]) storeTree[targetStore] = {};
                    if (!storeTree[targetStore][category]) storeTree[targetStore][category] = [];
                    storeTree[targetStore][category].push(it);
                  });

                  const storeKeys = Object.keys(storeTree);
                  const filteredStoreKeys = activeCategoryBatch === "ALL"
                    ? storeKeys
                    : storeKeys.filter((s) => s === activeCategoryBatch);

                  return (
                    <div className="space-y-3">
                      {/* Batch Store Filter Tabs for Viewing */}
                      {storeKeys.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Stores:</span>
                          <button
                            type="button"
                            onClick={() => setActiveCategoryBatch("ALL")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                              activeCategoryBatch === "ALL"
                                ? "bg-dispatcher-navy text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            All Stores ({currentItems.length})
                          </button>
                          {storeKeys.map((stKey) => {
                            const totalStoreItems = Object.values(storeTree[stKey] || {}).reduce((acc, curr) => acc + curr.length, 0);
                            return (
                              <button
                                key={stKey}
                                type="button"
                                onClick={() => setActiveCategoryBatch(stKey)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                                  activeCategoryBatch === stKey
                                    ? "bg-dispatcher-navy text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <span>📍</span>
                                <span className="truncate max-w-[130px]">{stKey}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                                    activeCategoryBatch === stKey ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {totalStoreItems}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentItems.length === 0 ? (
                        <div className="text-center py-5 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2.5">
                          <p className="text-xs text-slate-500 font-medium">
                            No items specified yet for this errand request.
                          </p>
                          {!isReadOnly && !isEditingItems && (
                            <button
                              type="button"
                              onClick={handleStartEditItems}
                              className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer ring-2 ring-blue-600/20 hover:ring-blue-600/40"
                            >
                              <Pencil size={13} strokeWidth={2.5} className="shrink-0" />
                              <span>Edit / Map Items Now</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredStoreKeys.map((storeKey) => {
                            const categoryMap = storeTree[storeKey] || {};
                            const categoryNames = Object.keys(categoryMap);
                            const matchedPin = pinpoints.find((p, pIdx) => {
                              const cleanName = (p.storeName || `Store ${pIdx + 1}`).replace(/[.#$/[\]]/g, " ").trim();
                              return storeKey.includes(cleanName) || storeKey === `Store ${pIdx + 1}`;
                            });
                            const totalStoreItems = categoryNames.reduce((acc, c) => acc + categoryMap[c].length, 0);

                            if (totalStoreItems === 0 && activeCategoryBatch === "ALL") return null;

                            return (
                              <div
                                key={storeKey}
                                className="bg-white rounded-xl border border-slate-300 shadow-2xs overflow-hidden"
                              >
                                {/* Level 1 Header: Store Pinpoint */}
                                <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-dispatcher-navy-dark to-dispatcher-navy text-white">
                                  <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-red-400 shrink-0" />
                                    <span className="font-extrabold text-xs">{storeKey}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {matchedPin && (
                                      <button
                                        type="button"
                                        onClick={() => handleFocusPinpoint(matchedPin)}
                                        className="text-[10px] text-blue-200 hover:text-white font-bold bg-white/10 px-2 py-0.5 rounded-md border border-white/20 transition cursor-pointer"
                                        title="View on Google Map"
                                      >
                                        🗺️ Map
                                      </button>
                                    )}
                                    <span className="bg-blue-400/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30 font-mono">
                                      {totalStoreItems} {totalStoreItems === 1 ? "item" : "items"}
                                    </span>
                                  </div>
                                </div>

                                {/* Level 2: Merchant Categories */}
                                {categoryNames.length === 0 ? (
                                  <div className="p-3 bg-slate-50 text-center text-slate-400 italic text-xs">
                                    No items assigned to this store.
                                  </div>
                                ) : (
                                  <div className="p-3 space-y-3 bg-slate-50/50">
                                    {categoryNames.map((catName) => {
                                      const catItems = categoryMap[catName];
                                      return (
                                        <div
                                          key={catName}
                                          className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs space-y-2"
                                        >
                                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                            <span className="font-extrabold text-xs text-dispatcher-navy flex items-center gap-1.5 uppercase tracking-wide">
                                              <span>📁</span> {catName}
                                            </span>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                              {catItems.length} {catItems.length === 1 ? "item" : "items"}
                                            </span>
                                          </div>

                                          {/* Level 3 & 4: Items & Quantity */}
                                          <div className="space-y-1.5">
                                            {catItems.map((item: any, iIdx: number) => (
                                              <div
                                                key={iIdx}
                                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-xs"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                  <span className="font-bold text-slate-800">{item.itemName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-black text-[11px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-mono">
                                                    Qty: {item.quantity || 1}
                                                  </span>
                                                  {item.unitPrice && (
                                                    <span className="text-slate-600 font-mono font-bold text-xs">
                                                      {formatPeso(Number(item.unitPrice))}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <DispatcherInlineBanner message={itemsFeedback.message} onDismiss={itemsFeedback.dismiss} />

                      {/* Navigation — always available, not just in Focus mode. */}
                      <div className="pt-2 border-t border-slate-100 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setActiveStepView(1)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft size={14} />
                          <span>Back to Store Locations</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveStepView(3)}
                          className="text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Continue to Payment</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* STEP CARD 3: PAYMENT MODE VERIFICATION HUB                          */}
          {/* ------------------------------------------------------------------- */}
          {orderDetails && (
            <>
              {activeStepView !== "ALL" && activeStepView !== 3 && (
                <button
                  type="button"
                  onClick={() => setActiveStepView(3)}
                  className="w-full text-left bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${confirmedPaymentMode ? "bg-emerald-100 text-emerald-800" : isPaymentEnabled ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                      {confirmedPaymentMode ? "✓" : "3"}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        <span>Step 3: Payment</span>
                        {confirmedPaymentMode ? (
                          <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified ({confirmedPaymentMode})
                          </span>
                        ) : isPaymentEnabled ? (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Waiting on customer
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                            Waiting on Step 2
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Confirm Cash on Delivery with the customer
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 flex items-center gap-1">
                    <span>Verify Payment</span>
                    <ChevronRight size={14} />
                  </span>
                </button>
              )}

              <div className={activeStepView !== "ALL" && activeStepView !== 3 ? "hidden" : "bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                      Step 3 of 4
                    </span>
                    <h3 className="text-slate-900 font-extrabold text-sm lg:text-base flex items-center gap-2">
                      <CreditCard size={16} className="text-blue-600" />
                      <span>Payment</span>
                    </h3>
                  </div>

                  {confirmedPaymentMode ? (
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Confirmed: {confirmedPaymentMode}
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                      Awaiting Verification
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirm the customer's Cash on Delivery payment so the rider knows to bring change.
                </p>

                {!isReadOnly && (
                  <div className="flex gap-2.5 pt-1">
                    {!isPaymentEnabled && (
                      <button
                        onClick={handleEnablePayment}
                        disabled={isEnablingPayment || !step2Done}
                        className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-xs text-xs cursor-pointer"
                      >
                        {isEnablingPayment ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {isEnablingPayment ? "Enabling..." : "1. Enable Payment"}
                      </button>
                    )}

                    <button
                      onClick={handlePromptPaymentMode}
                      disabled={isPromptingPayment || !!confirmedPaymentMode || !isPaymentEnabled}
                      className={`flex-1 ${confirmedPaymentMode ? "bg-emerald-600" : "bg-dispatcher-navy hover:bg-dispatcher-navy-dark"} disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-xs text-xs cursor-pointer active:scale-95`}
                    >
                      {isPromptingPayment ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                      {isPromptingPayment
                        ? "Sending..."
                        : confirmedPaymentMode
                          ? "Payment Method Verified"
                          : isPaymentEnabled
                            ? "2. Prompt Customer in Chat"
                            : "Prompt Verification"}
                    </button>
                  </div>
                )}

                {!isReadOnly && !step2Done && !isPaymentEnabled && (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-700" />
                      <span>Waiting on Step 2</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Payment unlocks once the customer approves the order confirmation card in live chat.
                    </p>
                  </div>
                )}

                {/* Navigation — always available, not just in Focus mode. */}
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStepView(2)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Items & Stores</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStepView(4)}
                    className="text-xs font-black text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to Rider Dispatch</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* STEP CARD 4: RIDER FLEET ASSIGNMENT & DISPATCH (CELEBRATORY UNLOCK)  */}
          {/* ------------------------------------------------------------------- */}
          {!isReadOnly && orderDetails && (
            <>
              {activeStepView !== "ALL" && activeStepView !== 4 && (
                <button
                  type="button"
                  onClick={() => setActiveStepView(4)}
                  className="w-full text-left bg-white hover:bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer transition active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${orderDetails?.riderId ? "bg-emerald-100 text-emerald-800" : canAssignRider ? "bg-emerald-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"}`}>
                      {orderDetails?.riderId ? "✓" : canAssignRider ? <Bike size={14} /> : "4"}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        <span>Step 4: Rider Dispatch</span>
                        {orderDetails?.riderId ? (
                          <span className="text-[10px] text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Rider dispatched
                          </span>
                        ) : canAssignRider ? (
                          <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Ready to dispatch
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                            Locked
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {orderDetails?.riderId ? `Assigned to ${orderDetails.rider?.fullName || "Rider"}` : "We'll assign the closest available rider automatically"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-700 group-hover:text-blue-900 flex items-center gap-1">
                    <span>Rider Dispatch</span>
                    <ChevronRight size={14} />
                  </span>
                </button>
              )}

              <div
                className={
                  activeStepView !== "ALL" && activeStepView !== 4
                    ? "hidden"
                    : `rounded-2xl p-5 border shadow-xs space-y-4 transition-all duration-300 ${
                        canAssignRider
                          ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-300 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-white border-slate-200"
                      }`
                }
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        canAssignRider ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Step 4 of 4
                    </span>
                    <h3 className="text-slate-900 font-extrabold text-sm lg:text-base flex items-center gap-2">
                      <UserCheck size={16} className={canAssignRider ? "text-emerald-600" : "text-slate-500"} />
                      <span>Rider Dispatch</span>
                    </h3>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full border ${
                      canAssignRider
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {canAssignRider ? "Ready to dispatch" : "Locked"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  We'll assign the closest available rider automatically.
                </p>

                <button
                  onClick={handleAssignRiderNow}
                  disabled={!canAssignRider || isAssigning}
                  className={`w-full font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition shadow-md active:scale-95 text-sm cursor-pointer ${
                    canAssignRider
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Finding the nearest rider...</span>
                    </>
                  ) : (
                    <>
                      <Bike size={18} />
                      <span>Assign Nearest Rider</span>
                    </>
                  )}
                </button>

                {!canAssignRider && (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-700" />
                      <span>Before you can assign a rider:</span>
                    </p>
                    <ul className="space-y-1 pl-1 text-[11px]">
                      <li className={`flex items-center gap-1.5 ${step1Done ? "text-emerald-700 font-bold" : "text-amber-800"}`}>
                        <span>{step1Done ? "✓" : "○"}</span>
                        <span>Step 1: Store pinpoints & item checklist saved</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${step2Done ? "text-emerald-700 font-bold" : "text-amber-800"}`}>
                        <span>{step2Done ? "✓" : "○"}</span>
                        <span>Step 2: Customer approves order confirmation card in live chat</span>
                      </li>
                      <li className={`flex items-center gap-1.5 ${step3Done ? "text-emerald-700 font-bold" : "text-amber-800"}`}>
                        <span>{step3Done ? "✓" : "○"}</span>
                        <span>Step 3: Payment mode (COD) verified</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          </div>
        </div>
      </div>

      <Dialog open={showPassByConfirm} onOpenChange={setShowPassByConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Slash className="text-amber-600" size={20} /> Close without an order?
            </DialogTitle>
            <DialogClose className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X size={18} />
            </DialogClose>
          </DialogHeader>
          <DialogDescription>
            No purchase will be made and no rider will be sent. The customer will see this request closed. This can't be undone from here.
          </DialogDescription>
          <DialogFooter className="flex-row gap-3">
            <button
              type="button"
              onClick={() => setShowPassByConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPassByConfirm(false);
                handleCloseChatPassingBy();
              }}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <Slash size={16} /> Close Without an Order
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DispatcherChatPanel;
