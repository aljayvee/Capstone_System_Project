import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue } from "firebase/database";
import { io, Socket } from "socket.io-client";
import { database } from "../../../firebase/config";
import { apiClient } from "../../../services/apiClient";
import { loadGoogleMapsScript, importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import { formatErrandId } from "../../../utils/formatErrandId";
import { ChatBubble } from "../../../components/chat/ChatBubble";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { UnauthorizedErrandScreen } from "./UnauthorizedErrandScreen";
import { SERVICE_AREA_BOUNDS } from "../../../constants/serviceArea";

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

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

export const DispatcherChatPanel: React.FC<DispatcherChatPanelProps> = ({
  orderId,
  dispatcher,
  onClose,
  onRefreshOrders,
  readOnly = false,
}) => {
  // Core Chat & Errand state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  // Responsive mobile/compact tab switch (< 1024px)
  const [mobileActiveTab, setMobileActiveTab] = useState<"chat" | "tools">("chat");

  // Payment mode verification state
  const [confirmedPaymentMode, setConfirmedPaymentMode] = useState<string | null>(null);
  const [isPromptingPayment, setIsPromptingPayment] = useState(false);
  const [isEnablingPayment, setIsEnablingPayment] = useState(false);

  // Tools state (Pinpoints, Items, Maps)
  const [pinpoints, setPinpoints] = useState<StorePinpoint[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Requested Items state
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editableItems, setEditableItems] = useState<{ itemName: string; storeCategory?: string; quantity: number }[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [itemsSaveMessage, setItemsSaveMessage] = useState<string | null>(null);

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

  // Assign Rider state (Single Assign Rider Now action)
  const [isAssigning, setIsAssigning] = useState(false);
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
        const currentRole = String(dispatcher?.role || "").toLowerCase();
        if (
          currentRole === "dispatcher" &&
          errandData?.dispatcherId &&
          dispatcher?.id &&
          String(errandData.dispatcherId) !== String(dispatcher.id)
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
          setPinpoints(
            errandData.pinpoints.map((p: any) => ({
              id: p.id,
              storeName: p.storeName || p.name || "Store",
              latitude: Number(p.latitude || p.lat),
              longitude: Number(p.longitude || p.lng),
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
  }, [orderId, dispatcher, onClose]);

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
      alert("Failed to enable payment mode selection.");
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
        text: "💳 Please select your preferred payment mode for verification. No payment is being processed right now.",
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
                alert("Maximum 3 store pinpoints allowed per errand.");
                return prev;
              }
              const storeNum = prev.length + 1;
              const finalName = cleanName || `Store ${storeNum}`;
              return [...prev, { storeName: finalName, latitude: lat, longitude: lng }];
            });
            setSearchStoreInput("");
          };

          if (typed) {
            commitPin(typed);
          } else if ((window as any).google?.maps?.Geocoder) {
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === "OK" && results && results[0]) {
                const placeName = results[0].address_components?.[0]?.long_name || results[0].formatted_address.split(",")[0] || results[0].formatted_address;
                commitPin(placeName);
              } else {
                commitPin(`Store ${pinpoints.length + 1}`);
              }
            });
          } else {
            commitPin(`Store ${pinpoints.length + 1}`);
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
  }, [isMapLoaded]);

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

  // Search Store & handle Multiple Branch Results (2-Tier Algorithm)
  const handleSearchAndPinStore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchStoreInput.trim();
    if (!trimmed) {
      alert("Please type a store name to search & drop pin.");
      return;
    }
    if (pinpoints.length >= 3) {
      alert("Maximum 3 store pinpoints allowed per errand.");
      return;
    }

    setIsSearchingStore(true);
    setSearchResults([]);

    // TIER 1: Search Database Verified Places (Pre-recorded Ground Truth)
    try {
      const dbRes = await apiClient.get(`/places?search=${encodeURIComponent(trimmed)}`);
      const dbPlaces: any[] = dbRes.data || [];

      if (dbPlaces.length > 1) {
        const mappedDbResults = dbPlaces.map((p) => ({
          name: p.name,
          formatted_address: p.address + (p.barangay ? `, Brgy. ${p.barangay}` : ""),
          categoryName: p.category?.name,
          geometry: { location: { lat: () => p.latitude, lng: () => p.longitude } },
          isVerifiedDb: true,
        }));
        setSearchResults(mappedDbResults);
        setIsSearchingStore(false);
        return;
      }

      if (dbPlaces.length === 1) {
        const item = dbPlaces[0];
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        setPinpoints((prev) => [...prev, { storeName: item.name, latitude: lat, longitude: lng }]);
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
                    alert(`Could not find "${trimmed}" in Tacurong City. Please check the spelling or click directly on the map to drop a pin.`);
                  }
                } else {
                  alert(`Could not find "${trimmed}" in Tacurong City. Please check the spelling or click directly on the map to drop a pin.`);
                }
              }
            );
          } else {
            alert(`Could not find "${trimmed}". Please click directly on the map to drop a pin.`);
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
              alert(`Could not find "${trimmed}" in Tacurong City. Please click directly on the map to drop a pin.`);
            }
          }
        );
      } else {
        setIsSearchingStore(false);
        alert("Google Maps is still loading. Please try again in a moment.");
      }
    } catch (err) {
      console.warn("Place search failed:", err);
      setIsSearchingStore(false);
      alert(`Could not find "${trimmed}". Please click on the map directly to drop a pin.`);
    }
  };

  const handleSelectPlaceResult = (result: any) => {
    if (pinpoints.length >= 3) {
      alert("Maximum 3 store pinpoints allowed per errand.");
      return;
    }

    const loc = result.geometry.location;
    const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
    const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);

    const fullAddr = result.formatted_address || "";
    const streetName = fullAddr.split(",")[0] || searchStoreInput;
    const branchTitle = result.name || `${searchStoreInput} (${streetName})`;

    setPinpoints((prev) => [...prev, { storeName: branchTitle, latitude: lat, longitude: lng }]);
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
    if (googleMapInstance.current) {
      const lat = parseFloat(String(pin.latitude));
      const lng = parseFloat(String(pin.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        googleMapInstance.current.panTo({ lat, lng });
        googleMapInstance.current.setZoom(16);
      }
    }
  };

  const handleSaveAndSendMap = async () => {
    setIsSavingPins(true);
    setPinMessage(null);
    try {
      const storesList = pinpoints.map((p) => p.storeName).join(", ");
      const sanitizedPinpoints = pinpoints
        .map((p) => ({
          storeName: p.storeName || "Store",
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      await apiClient.post(`/errands/${orderId}/pinpoints`, { pinpoints: sanitizedPinpoints });

      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "pinpoints",
        text: `📍 I have set the exact store locations for your errand: ${storesList || "Stores updated"}. You can view the Map Pinpoints in your app!`,
        pinpoints: sanitizedPinpoints,
        timestamp: Date.now(),
      });

      setPinMessage("✅ Store pinpoints saved and sent to customer!");
      setTimeout(() => setPinMessage(null), 4000);
    } catch (err) {
      alert("Failed to save store pinpoints to the errand record.");
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

  const handleAddEditableItem = () => {
    setEditableItems((prev) => [...prev, { itemName: "", quantity: 1 }]);
  };

  const handleRemoveEditableItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
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
      alert("No items specified. Please click 'Edit Checklist' and add at least one item.");
      return;
    }

    setIsSavingItems(true);
    try {
      const res = await apiClient.patch(`/errands/${orderId}/items`, { items: sanitized });
      const updatedErrand = res.data?.errand || res.data;
      setOrderDetails(updatedErrand);
      setIsEditingItems(false);

      // Build structured store-to-item mapping with strictly sanitized dictionary keys
      const grouped: Record<string, any[]> = {};
      sanitized.forEach((it) => {
        const storeKey = it.storeCategory.replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim() || "Store 1";
        if (!grouped[storeKey]) grouped[storeKey] = [];
        grouped[storeKey].push({
          itemName: it.itemName,
          quantity: it.quantity,
          priceNote: "Actual store receipt upon purchase",
        });
      });

      const storeGroups = Object.keys(grouped).map((storeName) => ({
        storeName,
        items: grouped[storeName],
      }));

      const sanitizedPinpoints = pinpoints
        .map((p) => ({
          storeName: (p.storeName || "Store").replace(/[.#$/[\]]/g, " ").replace(/\s+/g, " ").trim(),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
        }))
        .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

      const deliveryFee = Number(updatedErrand?.deliveryFee || orderDetails?.deliveryFee || 50);
      const totalCost = Number(updatedErrand?.totalCost || orderDetails?.totalCost || 50);

      // Push structured Order Confirmation Card to customer live chat
      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        type: "order_confirmation",
        text: "📋 Order Confirmation Card: Please review the item-to-store breakdown and upfront delivery fee below.",
        pinpoints: sanitizedPinpoints,
        items: sanitized,
        groupedItems: grouped,
        storeGroups: storeGroups,
        deliveryFee,
        totalCost,
        confirmed: false,
        timestamp: Date.now(),
      });

      setHasSentConfirmationCard(true);
      setItemsSaveMessage("✅ Item-store mapping saved & Confirmation Card sent to customer!");
      setTimeout(() => setItemsSaveMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to save updated items:", err);
      alert(err.response?.data?.message || err.response?.data?.error || err.message || "Failed to save updated items.");
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleCloseChatPassingBy = async () => {
    if (confirm("Close this chat without transaction? Order status will be updated to 'PASSING BY'.")) {
      try {
        await apiClient.patch(`/errands/${orderId}/status`, { status: "PASSING BY" });
        if (onRefreshOrders) onRefreshOrders();
      } catch (e) {}
      onClose();
    }
  };

  // Stepper milestone status calculation (Hick's Law / Cognitive Guidance)
  const hasItems = Boolean(orderDetails?.pabiliDetails?.length || orderDetails?.pabiliItemRequests?.length);
  const hasPins = pinpoints.length > 0;
  const isPaymentConfirmed = Boolean(confirmedPaymentMode);
  const canAssignRider = hasItems && hasPins && isCustomerConfirmed && isPaymentConfirmed;

  const handleAssignRiderNow = async () => {
    if (!canAssignRider) {
      alert("Please complete all prior steps (Items, Pinpoints, Customer Confirmation, and Payment Verification) before assigning a rider.");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await apiClient.post(`/errands/${orderId}/assign-rider`, {});
      const errandData = res.data?.errand || res.data;
      const assignedRider = errandData?.rider;
      const riderName = assignedRider?.name || (assignedRider?.firstName ? `${assignedRider.firstName} ${assignedRider.lastName || ""}`.trim() : "Rider");

      alert(`✅ Rider ${riderName} has been assigned to Order #${formatErrandId(orderId)}!`);

      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        text: `🛵 Rider ${riderName} has been assigned to your errand and is now on duty!`,
        timestamp: Date.now(),
      });

      if (onRefreshOrders) onRefreshOrders();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to assign rider.";
      alert(errorMsg);
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

  return (
    <Drawer open={true} onOpenChange={(open) => { if (!open) onClose(); }} swipeDirection="right">
      <DrawerContent className="h-screen fixed top-0 bottom-0 right-0 border-l border-slate-300 p-0 rounded-none shadow-2xl flex flex-col w-[1040px] max-w-[98vw] bg-white">
        {/* UNIFIED CONSOLE TOP HEADER */}
        <header className="bg-[#1E3A5F] text-white px-5 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-white shadow-inner">
              <Compass size={20} className="text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DrawerTitle className="font-extrabold text-sm text-white tracking-wide">
                  {isReadOnly ? "Archived Errand Session" : "Dispatcher Live Operations Console"}
                </DrawerTitle>
                <span className="bg-blue-900/80 text-blue-200 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  Order #{formatErrandId(orderId)}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {orderDetails?.status || "PENDING"}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 flex items-center gap-2 mt-0.5">
                <span>Customer: <strong className="text-white">{orderDetails?.customer?.name || orderDetails?.customerName || "Customer User"}</strong></span>
                <span>•</span>
                <span className="truncate max-w-[280px]">Drop-off: <strong className="text-white">{orderDetails?.deliveryAddress || "Tacurong City"}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile/Compact Screen Tab Switcher */}
            <div className="lg:hidden flex bg-blue-950/60 p-0.5 rounded-lg border border-blue-400/20 text-xs">
              <button
                type="button"
                onClick={() => setMobileActiveTab("chat")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${mobileActiveTab === "chat" ? "bg-blue-600 text-white" : "text-blue-200"}`}
              >
                💬 Chat
              </button>
              <button
                type="button"
                onClick={() => setMobileActiveTab("tools")}
                className={`px-2.5 py-1 rounded-md font-bold transition ${mobileActiveTab === "tools" ? "bg-blue-600 text-white" : "text-blue-200"}`}
              >
                🛠️ Tools {pinpoints.length > 0 && `(${pinpoints.length})`}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
              title="Close Operations Console"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* 4-STEP DISPATCH WORKFLOW STEPPER BAR (Cognitive Progression) */}
        {!isReadOnly && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider shrink-0">Workflow:</span>
              
              <div className={`flex items-center gap-1.5 font-bold ${hasItems && hasPins ? "text-emerald-700" : "text-slate-500"}`}>
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] text-white ${hasItems && hasPins ? "bg-emerald-600" : "bg-slate-400"}`}>1</span>
                <span>1. Stores & Items Pinned ({pinpoints.length}/3)</span>
              </div>
              <ChevronRight size={12} className="text-slate-300 shrink-0" />

              <div className={`flex items-center gap-1.5 font-bold ${isCustomerConfirmed ? "text-emerald-700" : hasSentConfirmationCard ? "text-blue-700" : "text-slate-500"}`}>
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] text-white ${isCustomerConfirmed ? "bg-emerald-600" : hasSentConfirmationCard ? "bg-blue-600" : "bg-slate-400"}`}>2</span>
                <span>2. Customer Confirmation ({isCustomerConfirmed ? "Approved ✓" : hasSentConfirmationCard ? "Awaiting Card Approval" : "Pending Card"})</span>
              </div>
              <ChevronRight size={12} className="text-slate-300 shrink-0" />

              <div className={`flex items-center gap-1.5 font-bold ${isPaymentConfirmed ? "text-emerald-700" : isPaymentEnabled ? "text-blue-700" : "text-slate-500"}`}>
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] text-white ${isPaymentConfirmed ? "bg-emerald-600" : isPaymentEnabled ? "bg-blue-600" : "bg-slate-400"}`}>3</span>
                <span>3. Payment ({isPaymentConfirmed ? `Confirmed: ${confirmedPaymentMode} ✓` : isPaymentEnabled ? "Prompted" : "Pending"})</span>
              </div>
              <ChevronRight size={12} className="text-slate-300 shrink-0" />

              <div className={`flex items-center gap-1.5 font-bold ${canAssignRider ? "text-emerald-700" : "text-slate-400"}`}>
                <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] text-white ${canAssignRider ? "bg-emerald-600" : "bg-slate-300"}`}>4</span>
                <span>4. Assign Rider ({canAssignRider ? "Ready" : "Locked 🔒"})</span>
              </div>
            </div>

            <button
              onClick={handleCloseChatPassingBy}
              className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg transition shrink-0 ml-2"
              title="Close chat without proceeding to an order"
            >
              <Slash size={11} /> Pass By
            </button>
          </div>
        )}

        {/* DUAL-PANE MAIN WORKSPACE CONTAINER */}
        <div className="flex-1 flex overflow-hidden">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: LIVE CUSTOMER CHAT (45% Width on Desktop)                   */}
          {/* ========================================================================= */}
          <div className={`w-full lg:w-[45%] border-r border-slate-200 flex flex-col bg-white ${mobileActiveTab === "chat" ? "flex" : "hidden lg:flex"}`}>
            {/* Live Chat Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-50/70">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Loading chat transcript...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                  <MessageSquare size={32} className="text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No messages in this errand yet</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Use the quick reply chips below or type a message to start coordinating with the customer.
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

            {/* Quick Reply Chips (Sub-3-second customer reassurance) */}
            {!isReadOnly && (
              <div className="px-3 py-2 bg-slate-100/80 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Quick:</span>
                {[
                  "📍 Confirming store location...",
                  "🛍️ Are all items in stock?",
                  "💳 Please verify your payment mode.",
                  "🛵 Assigning on-duty rider now!",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputText(chip)}
                    className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200/90 font-medium shrink-0 shadow-2xs transition active:scale-95"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Form */}
            {isReadOnly ? (
              <div className="p-3 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
                <span>🔒 This chat session is archived and read-only.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type message to customer (Enter to send)..."
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-300 text-white p-2.5 rounded-xl transition shadow-sm flex items-center justify-center shrink-0 active:scale-95"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: DISPATCHER MISSION CONTROL & TOOLS (55% Width on Desktop)  */}
          {/* ========================================================================= */}
          <div className={`w-full lg:w-[55%] flex flex-col bg-slate-50 overflow-y-auto ${mobileActiveTab === "tools" ? "flex" : "hidden lg:flex"}`}>
            <div className="p-4 space-y-4 text-xs">
              
              {/* TOOL CARD 1: INTERACTIVE GOOGLE MAPS STORE PINPOINTING */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#1E3A5F] font-bold text-xs">
                    <MapPin size={15} className="text-red-600" /> Interactive Store Map Pinpointing
                  </span>
                  <span className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                    {pinpoints.length}/3 Stores
                  </span>
                </div>

                {/* Embedded Google Maps Div */}
                <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100 shadow-inner">
                  <div ref={mapRef} className="w-full h-full" />
                  {!isMapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[11px]">
                      Loading Google Maps...
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1 bg-white/90 backdrop-blur-xs p-1 text-[9px] text-slate-600 text-center rounded border border-slate-200/60 shadow-xs">
                    💡 Click anywhere on map to drop pin, or search store name below
                  </div>
                </div>

                {/* Store Search Form (2-Tier POI Engine) */}
                {!isReadOnly && (
                  <form onSubmit={handleSearchAndPinStore} className="space-y-1.5">
                    <div className="relative flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search store name (e.g. Jollibee, Mercury Drug)..."
                          value={searchStoreInput}
                          onChange={(e) => setSearchStoreInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-2 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3A5F] focus:ring-1 focus:ring-[#1E3A5F] transition"
                        />
                        {searchStoreInput && (
                          <button
                            type="button"
                            onClick={() => setSearchStoreInput("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={!searchStoreInput.trim() || isSearchingStore || pinpoints.length >= 3}
                        className="bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold px-3 py-2 rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition shrink-0"
                      >
                        {isSearchingStore ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <MapPin size={13} />
                        )}
                        <span>Pin Store</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Multi-Branch Store Selection Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-blue-300 rounded-xl p-2 space-y-1.5 shadow-lg animate-fade-in my-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1 px-1">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                        📍 Multiple ({searchResults.length}) Branches Found - Select:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchResults([])}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {searchResults.map((res, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => handleHoverPlaceResult(res)}
                          onClick={() => handleSelectPlaceResult(res)}
                          className="w-full text-left bg-slate-50 hover:bg-blue-50 text-slate-800 p-2 rounded-lg border border-slate-100 hover:border-blue-200 text-[11px] flex items-center justify-between transition cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Compass size={13} className="text-blue-600" />
                              <span>{res.name || res.formatted_address?.split(",")[0] || searchStoreInput}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[280px]">
                              {res.formatted_address}
                            </p>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded shrink-0 ml-2 border border-blue-200">
                            Hover & Pin
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pinpoints List with Map Focus */}
                <div className="space-y-1.5">
                  {pinpoints.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic text-center py-1">No store pins added yet. Search above or click map directly.</p>
                  ) : (
                    pinpoints.map((pin, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 hover:border-blue-400 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{pin.storeName}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFocusPinpoint(pin)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition"
                            title="Pan map to this store"
                          >
                            <Target size={14} />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemovePinpoint(idx)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition"
                              title="Remove Store Pin"
                            >
                              <Trash2 size={14} />
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
                    className="w-full bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs text-xs"
                  >
                    <MapPin size={14} /> Send Pinpoint Map to Customer
                  </button>
                )}

                {/* LIVE DELIVERY FEE PREVIEW */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Base Fare (First 2.0 km):</span>
                    <span className="font-mono font-bold text-slate-800">₱50.00</span>
                  </div>
                  {pinpoints.length > 1 && (
                    <div className="flex items-center justify-between text-amber-700">
                      <span>Multi-Store Surcharge ({pinpoints.length - 1} extra):</span>
                      <span className="font-mono font-bold">+₱{(pinpoints.length - 1) * 30}.00</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                    <span>Calculated Delivery Fee:</span>
                    <span className="font-mono text-emerald-700">
                      ₱{Number(orderDetails?.deliveryFee || (pinpoints.length > 1 ? 50 + (pinpoints.length - 1) * 30 : 50)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {pinMessage && (
                  <p className="text-[11px] text-emerald-600 text-center font-bold animate-fade-in">
                    {pinMessage}
                  </p>
                )}
              </div>

              {/* TOOL CARD 2: REQUESTED ITEMS & CHECKLIST WITH STORE PINPOINT MAPPING */}
              {orderDetails && (
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#1E3A5F] font-bold text-xs">
                      <Package size={15} className="text-[#1E3A5F]" /> Itemized Errand Checklist & Store Mapping
                    </span>
                    {!isReadOnly && !isEditingItems && (
                      <button
                        onClick={handleStartEditItems}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                      >
                        <Pencil size={11} /> Map / Edit Items
                      </button>
                    )}
                  </div>

                  {isEditingItems ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 italic">
                        Map each item to its respective store pinpoint before sending the Confirmation Card:
                      </p>
                      {editableItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <select
                            value={item.storeCategory || (pinpoints[0] ? `Store 1 - ${pinpoints[0].storeName.replace(/[.#$/[\]]/g, ' ').trim()}` : "Store 1")}
                            onChange={(e) =>
                              setEditableItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, storeCategory: e.target.value } : it))
                              )
                            }
                            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] text-blue-900 font-bold max-w-[180px] truncate"
                          >
                            {pinpoints.length > 0 ? (
                              pinpoints.map((p, pIdx) => {
                                const cleanStoreName = (p.storeName || `Store ${pIdx + 1}`).replace(/[.#$/[\]]/g, ' ').trim();
                                const val = `Store ${pIdx + 1} - ${cleanStoreName}`;
                                return (
                                  <option key={pIdx} value={val}>
                                    {val}
                                  </option>
                                );
                              })
                            ) : (
                              <>
                                <option value="Store 1">Store 1</option>
                                <option value="Store 2">Store 2</option>
                                <option value="Store 3">Store 3</option>
                              </>
                            )}
                          </select>
                          <input
                            value={item.itemName}
                            onChange={(e) =>
                              setEditableItems((prev) => prev.map((it, i) => (i === idx ? { ...it, itemName: e.target.value } : it)))
                            }
                            placeholder="Item name (e.g. Chicken Joy)"
                            className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs text-slate-800 font-medium"
                          />
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              setEditableItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) } : it))
                              )
                            }
                            className="w-14 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-center font-bold text-slate-800"
                          />
                          <button onClick={() => handleRemoveEditableItem(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={handleAddEditableItem}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 pt-0.5"
                      >
                        <Plus size={13} /> Add Item
                      </button>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleCancelEditItems} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 rounded-lg transition">
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveItemsAndSendConfirmationCard}
                          disabled={isSavingItems}
                          className="flex-1 bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-300 text-white font-bold py-1.5 rounded-lg transition shadow-xs text-xs"
                        >
                          {isSavingItems ? "Saving & Sending..." : "Save & Send Confirmation Card"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const currentItems = (orderDetails.pabiliDetails && orderDetails.pabiliDetails.length > 0)
                          ? orderDetails.pabiliDetails
                          : (orderDetails.pabiliItemRequests || []);
                        return (
                          <>
                            <ul className="text-slate-700 space-y-1">
                              {currentItems.length === 0 ? (
                                <li className="text-slate-400 italic">No items specified yet.</li>
                              ) : (
                                currentItems.map((item: any, idx: number) => (
                                  <li key={item.id || idx} className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                      <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-100/60 border border-blue-200 rounded px-1.5 py-0.5">
                                        {item.storeCategory || "Store 1"}
                                      </span>
                                      <span className="truncate text-slate-800 font-medium">{item.itemName}</span>
                                    </span>
                                    <span className="font-bold text-slate-700 shrink-0 text-xs">x{item.quantity}</span>
                                  </li>
                                ))
                              )}
                            </ul>
                            {!isReadOnly && (
                              <button
                                onClick={handleSaveItemsAndSendConfirmationCard}
                                disabled={isSavingItems || currentItems.length === 0}
                                className="w-full bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs text-xs"
                              >
                                <Sparkles size={13} /> {hasSentConfirmationCard ? "Re-send Confirmation Card to Customer" : "Send Order Confirmation Card to Customer"}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  {itemsSaveMessage && <p className="text-[11px] text-emerald-600 font-bold text-center">{itemsSaveMessage}</p>}
                </div>
              )}

              {/* TOOL CARD 3: PAYMENT MODE VERIFICATION HUB */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#1E3A5F] font-bold text-xs">
                    <CreditCard size={15} className="text-blue-600" /> Step 3: Payment Mode Verification
                  </span>
                  {confirmedPaymentMode ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                      Confirmed: {confirmedPaymentMode} ✓
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Awaiting Customer Selection
                    </span>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex gap-2 pt-1">
                    {!isPaymentEnabled && (
                      <button
                        onClick={handleEnablePayment}
                        disabled={isEnablingPayment}
                        className="flex-1 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <CheckCircle2 size={14} /> {isEnablingPayment ? "Enabling..." : "1. Enable Payment"}
                      </button>
                    )}

                    <button
                      onClick={handlePromptPaymentMode}
                      disabled={isPromptingPayment || !!confirmedPaymentMode || !isPaymentEnabled}
                      className={`flex-1 ${confirmedPaymentMode ? "bg-emerald-600" : "bg-[#1E3A5F] hover:bg-[#162D4A]"} disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs`}
                    >
                      <CreditCard size={14} />{" "}
                      {confirmedPaymentMode ? "Payment Mode Verified" : isPaymentEnabled ? "2. Prompt Customer" : "Prompt Verification"}
                    </button>
                  </div>
                )}
              </div>

              {/* TOOL CARD 4: RIDER FLEET ASSIGNMENT & DISPATCH (STEP-GATED PIPELINE) */}
              {!isReadOnly && (
                <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                      <UserCheck size={15} className="text-emerald-600" /> Step 4: Assign Rider Now
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${canAssignRider ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {canAssignRider ? "Ready to Dispatch" : "Locked 🔒"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Intelligent assignment algorithm prioritizes repeat customer rider (max 3 transactions cap) or auto-assigns nearest available rider by GPS radius to Store 1.
                  </p>

                  <button
                    onClick={handleAssignRiderNow}
                    disabled={!canAssignRider || isAssigning}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm active:scale-95 text-xs"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Assigning Nearest Eligible Rider...</span>
                      </>
                    ) : (
                      <>
                        <Bike size={16} />
                        <span>Assign Rider Now</span>
                      </>
                    )}
                  </button>

                  {!canAssignRider && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <span>🔒 Sequential Dispatch Pipeline Requirements:</span>
                      </p>
                      <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-700">
                        <li className={hasItems && hasPins ? "text-emerald-700 font-bold" : ""}>
                          Step 1: Stores pinned ({pinpoints.length}/3) & items mapped ({hasItems && hasPins ? "Done ✓" : "Pending"})
                        </li>
                        <li className={isCustomerConfirmed ? "text-emerald-700 font-bold" : ""}>
                          Step 2: Customer confirms breakdown in live chat ({isCustomerConfirmed ? "Approved ✓" : hasSentConfirmationCard ? "Card Sent - Awaiting Approval" : "Pending Card"})
                        </li>
                        <li className={isPaymentConfirmed ? "text-emerald-700 font-bold" : ""}>
                          Step 3: Payment mode verified ({isPaymentConfirmed ? `Confirmed: ${confirmedPaymentMode} ✓` : "Pending"})
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
export default DispatcherChatPanel;
