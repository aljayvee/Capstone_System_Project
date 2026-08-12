import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue } from "firebase/database";
import { database } from "../../../firebase/config";
import { apiClient } from "../../../services/apiClient";
import { loadGoogleMapsScript, importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import { ChatBubble } from "../../../components/chat/ChatBubble";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Compass,
  Search,
  Target,
  Loader2,
} from "lucide-react";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const isReadOnly =
    readOnly ||
    (orderDetails &&
      ["PASSING BY", "CANCELLED", "COMPLETED", "DELIVERED"].includes(
        String(orderDetails.status).toUpperCase()
      ));

  // Fetch Order details for header summary card
  useEffect(() => {
    async function fetchOrderInfo() {
      try {
        const res = await apiClient.get(`/errands/${orderId}`);
        setOrderDetails(res.data?.errand || res.data || null);
      } catch (err) {
        console.warn("Failed to fetch order details:", err);
      }
    }
    if (orderId) {
      fetchOrderInfo();
    }
  }, [orderId]);

  // Tools Panel state (2nd Drawer)
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [pinpoints, setPinpoints] = useState<StorePinpoint[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Custom Search Input state for Google Maps
  const [searchStoreInput, setSearchStoreInput] = useState("");
  const [isSearchingStore, setIsSearchingStore] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Google Maps ref & instances
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Assign Rider Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dispatcherFirstName = dispatcher?.name ? dispatcher.name.split(" ")[0] : "Dispatcher";

  // Load Google Maps JavaScript API dynamically via loadGoogleMapsScript utility
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setIsMapLoaded(true))
      .catch((err) => console.warn("Google Maps script load failed:", err));
  }, []);

  // Initialize Google Maps instance when 2nd Drawer opens
  useEffect(() => {
    let timer: any;

    if (!isToolsOpen) {
      googleMapInstance.current = null;
      markersRef.current = [];
      return;
    }

    async function initGoogleMap() {
      if (!isMapLoaded || !mapRef.current) return;

      try {
        const mapsLib = await importGoogleMapsLibrary("maps");
        await importGoogleMapsLibrary("marker");

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass || !mapRef.current) {
          console.warn("Google Maps Map class not available.");
          return;
        }

        // Reset if container is empty
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

        // Click on Google Maps to drop a pinpoint marker
        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const name = searchStoreInput.trim() || `Store Pin #${pinpoints.length + 1}`;

          setPinpoints((prev) => {
            if (prev.length >= 3) {
              alert("Maximum 3 store pinpoints allowed per errand.");
              return prev;
            }
            return [...prev, { storeName: name, latitude: lat, longitude: lng }];
          });
          setSearchStoreInput("");
        });

        googleMapInstance.current = map;

        // Force resize trigger after drawer animation completes
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

    // Delay initialization slightly for Drawer slide-in animation to complete layout
    timer = setTimeout(initGoogleMap, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isMapLoaded, isToolsOpen]);

  // Update Google Maps markers when pinpoints array changes
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google || !isToolsOpen) return;
    const g = (window as any).google;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else m.map = null;
    });
    markersRef.current = [];

    // Render new markers for each pinpoint
    pinpoints.forEach((pin, idx) => {
      let marker: any;
      const latNum = parseFloat(String(pin.latitude));
      const lngNum = parseFloat(String(pin.longitude));
      const pos = { lat: latNum, lng: lngNum };
      const titleStr = `Store #${idx + 1}: ${pin.storeName}`;

      if (g.maps.marker && g.maps.marker.AdvancedMarkerElement) {
        // Modern AdvancedMarkerElement (using glyphText instead of deprecated glyph)
        const pinElement = new g.maps.marker.PinElement({
          glyphText: String(idx + 1),
          glyphColor: "#FFFFFF",
          background: "#EF4444",
          borderColor: "#991B1B",
        });

        marker = new g.maps.marker.AdvancedMarkerElement({
          map: googleMapInstance.current,
          position: pos,
          title: titleStr,
          content: pinElement,
        });
      } else {
        // Legacy Marker fallback
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
  }, [pinpoints, isToolsOpen]);

  // Load chat messages from Firebase
  useEffect(() => {
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
  }, [orderId]);



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Add store pinpoint (Max 3)
  const handleAddPresetPin = (preset: { storeName: string; latitude: number; longitude: number }) => {
    if (pinpoints.length >= 3) {
      alert("Maximum 3 store pinpoints allowed per errand request.");
      return;
    }
    setPinpoints((prev) => [...prev, { ...preset }]);
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

    const lower = trimmed.toLowerCase();

    // TIER 1: Search Tacurong Local POI Catalog (Instant 0ms Exact Branch Lookup)
    const localMatches = TACURONG_POI_CATALOG.filter((item) =>
      item.name.toLowerCase().includes(lower) ||
      item.keywords.some((k) => k.includes(lower) || lower.includes(k))
    ).map((item) => ({
      name: item.name,
      formatted_address: item.address,
      geometry: { location: { lat: () => item.lat, lng: () => item.lng } },
      isLocalPoi: true,
    }));

    if (localMatches.length > 1) {
      // Multiple store branches found locally (e.g. "Jollibee Tacurong Center" & "Jollibee Tacurong Drive-Thru")!
      setSearchResults(localMatches);
      setIsSearchingStore(false);
      return;
    }

    if (localMatches.length === 1) {
      // Single local branch match found - pin directly!
      const item = localMatches[0];
      const lat = item.geometry.location.lat();
      const lng = item.geometry.location.lng();
      setPinpoints((prev) => [...prev, { storeName: item.name, latitude: lat, longitude: lng }]);
      setSearchStoreInput("");
      setIsSearchingStore(false);

      if (googleMapInstance.current) {
        googleMapInstance.current.panTo({ lat, lng });
        googleMapInstance.current.setZoom(16);
      }
      return;
    }

    // TIER 2: Fallback to Google Maps Geocoder if not in local POI catalog
    try {
      const g = (window as any).google;
      if (g && g.maps && g.maps.Geocoder) {
        const geocoder = new g.maps.Geocoder();
        const searchAddress = `${trimmed}, Tacurong City, Sultan Kudarat, Philippines`;

        geocoder.geocode({ address: searchAddress }, (results: any, status: any) => {
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
            let lat = 6.671;
            let lng = 124.6644;
            if (googleMapInstance.current) {
              const center = googleMapInstance.current.getCenter();
              if (center) {
                lat = center.lat();
                lng = center.lng();
              }
            }
            setPinpoints((prev) => [...prev, { storeName: trimmed, latitude: lat, longitude: lng }]);
            setSearchStoreInput("");
          }
        });
      } else {
        setIsSearchingStore(false);
        let lat = 6.671;
        let lng = 124.6644;
        if (googleMapInstance.current) {
          const center = googleMapInstance.current.getCenter();
          if (center) {
            lat = center.lat();
            lng = center.lng();
          }
        }
        setPinpoints((prev) => [...prev, { storeName: trimmed, latitude: lat, longitude: lng }]);
        setSearchStoreInput("");
      }
    } catch (err) {
      console.warn("Geocoding search failed:", err);
      setIsSearchingStore(false);
    }
  };

  // Select a specific branch from multi-result dropdown
  const handleSelectPlaceResult = (result: any) => {
    if (pinpoints.length >= 3) {
      alert("Maximum 3 store pinpoints allowed per errand.");
      return;
    }

    const loc = result.geometry.location;
    const lat = loc.lat();
    const lng = loc.lng();

    // Use branch name / street address
    const fullAddr = result.formatted_address || "";
    const streetName = fullAddr.split(",")[0] || searchStoreInput;
    const branchTitle = `${searchStoreInput} (${streetName})`;

    setPinpoints((prev) => [...prev, { storeName: branchTitle, latitude: lat, longitude: lng }]);
    setSearchStoreInput("");
    setSearchResults([]);

    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat, lng });
      googleMapInstance.current.setZoom(16);
    }
  };

  // Hover over a branch result to live-preview map location
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

  // Focus Map on a specific Pinpoint
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

  // Save Store Pinpoints (persisted on the Errand record) & broadcast a friendly
  // chat notice to the customer.
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

      // Source of truth: persist pinpoints on the Errand record so the rider app
      // can read + follow them for live GIS routing.
      await apiClient.post(`/errands/${orderId}/pinpoints`, { pinpoints: sanitizedPinpoints });

      // Also push a friendly chat notice so the customer sees a "View Map" card.
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

  // Close Chat with "Passing By" Status
  const handleCloseChatPassingBy = async () => {
    if (confirm("Close this chat without transaction? Order status will be updated to 'PASSING BY'.")) {
      try {
        await apiClient.patch(`/errands/${orderId}/status`, { status: "PASSING BY" });
        if (onRefreshOrders) onRefreshOrders();
      } catch (e) {}
      onClose();
    }
  };

  // Fetch online riders for modal
  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const res = await apiClient.get('/riders/online');
      const riders = res.data?.riders || [];
      setOnlineRiders(riders);
      if (riders.length > 0) {
        setSelectedRiderId(String(riders[0].id));
      }
    } catch (err) {
      console.warn("Error fetching online riders:", err);
    }
  };

  // Assign Rider (Random or Chosen) -> Status "ASSIGNED"
  const handleConfirmAssignRider = async (isRandom = false) => {
    setIsAssigning(true);
    try {
      const body: any = {};
      if (!isRandom && selectedRiderId) {
        const selected = onlineRiders.find((r) => String(r.id) === String(selectedRiderId));
        if (selected) {
          body.riderId = selected.id;
          body.riderName = selected.name || `${selected.firstName} ${selected.lastName}`.trim();
        }
      }

      const res = await apiClient.post(`/errands/${orderId}/assign-rider`, body);
      const errandData = res.data?.errand || res.data;

      alert(`Rider ${errandData?.rider?.name || "assigned"} is now assigned for Order #${orderId}!`);
      
      // Push final notification message in chat
      const messagesRef = ref(database, `chats/${orderId}/messages`);
      push(messagesRef, {
        senderId: String(dispatcher?.id || "dispatcher-1"),
        senderName: dispatcherFirstName,
        role: "dispatcher",
        text: `🛵 Rider ${errandData?.rider?.name || "assigned"} has been assigned to your errand and is now DOING ERRAND. Chat is closing now!`,
        timestamp: Date.now(),
      });

      if (onRefreshOrders) onRefreshOrders();
      // Close the nested dialog first, then its ancestor drawer, then the chat
      // panel itself — unmounting an ancestor while the nested dialog is still
      // transitioning out can strand Base UI's inert-tracking counters.
      setIsAssignModalOpen(false);
      setIsToolsOpen(false);
      onClose(); // Automatically close chat on assignment
    } catch (err: any) {
      alert(err.message || "Error assigning rider.");
    } finally {
      setIsAssigning(false);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* 1ST DRAWER: LIVE ERRAND CHAT DRAWER */}
      <Drawer open={true} onOpenChange={(open) => { if (!open) onClose(); }} swipeDirection="right">
        <DrawerContent className="h-screen fixed top-0 bottom-0 right-0 border-l border-slate-200 p-0 rounded-none shadow-2xl flex flex-col w-[480px] max-w-[95vw] bg-white">
          {/* Panel Header */}
          <header className="bg-[#1E3A5F] text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-white">
                <MessageSquare size={18} />
              </div>
              <div>
                <DrawerTitle className="font-extrabold text-sm text-white">
                  {isReadOnly ? "Archived Chat Logs (Read-Only)" : "Live Errand Chat"}
                </DrawerTitle>
                <p className="text-xs text-blue-200 font-mono">Order #{orderId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <button
                  onClick={() => setIsToolsOpen(true)}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition animate-pulse-subtle"
                  title="Open Dispatcher Tools Drawer"
                >
                  <Compass size={14} /> Tools {pinpoints.length > 0 && `(${pinpoints.length})`}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
                title="Close Panel"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* ORDER CONTEXT & DETAILS SUMMARY CARD */}
          {orderDetails && (
            <div className="bg-slate-100 p-3.5 border-b border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="text-blue-900 font-mono">Order #{orderDetails.id || orderId}</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full uppercase font-extrabold border border-emerald-300">
                  {orderDetails.status || 'PENDING'}
                </span>
              </div>
              <p><span className="font-semibold text-slate-600">Customer:</span> {orderDetails.customer?.name || orderDetails.customerName || 'Customer User'}</p>
              <p><span className="font-semibold text-slate-600">Errand Category:</span> {orderDetails.category || 'Pabili Personal Shopper'}</p>
              {orderDetails.description && (
                <p><span className="font-semibold text-slate-600">Customer Notes:</span> {orderDetails.description}</p>
              )}
              {orderDetails.deliveryAddress && (
                <p className="truncate"><span className="font-semibold text-slate-600">Delivery Location:</span> {orderDetails.deliveryAddress}</p>
              )}
            </div>
          )}

          {/* Message Log Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-slate-50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading chat messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <MessageSquare size={32} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No messages found in transcript</p>
                <p className="text-xs text-slate-400">
                  {isReadOnly ? "This chat session was closed without saved messages." : "Send a message to discuss items or click Dispatcher Tools button at the top."}
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

          {/* Quick Dispatcher Reply Chips */}
          {!isReadOnly && (
            <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0 text-[10px] uppercase">Quick:</span>
              {[
                "📍 Confirming store location...",
                "🛍️ Are items in stock?",
                "🛵 Assigning rider now...",
                "💵 Please confirm total cost.",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(chip)}
                  className="bg-white hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200/80 font-medium shrink-0 shadow-xs transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Form or Read-Only Notice */}
          {isReadOnly ? (
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5">
              <span>🔒 This chat session is archived and read-only.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message to customer..."
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="bg-[#1E3A5F] hover:bg-[#162D4A] disabled:bg-slate-300 text-white p-2.5 rounded-xl transition shadow-sm flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </DrawerContent>
      </Drawer>

      {/* 2ND DRAWER: DISPATCHER TOOLS DRAWER (Right Side) */}
      {!isReadOnly && (
        <Drawer open={isToolsOpen} onOpenChange={setIsToolsOpen} swipeDirection="right">
          <DrawerContent className="h-screen fixed top-0 bottom-0 right-0 z-50 border-l border-slate-800 p-0 rounded-none shadow-2xl flex flex-col w-[420px] max-w-[95vw] bg-slate-900 text-slate-100">
            {/* Tool Panel Header */}
            <header className="p-4 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Compass size={18} />
                <DrawerTitle className="text-slate-100 font-bold text-sm">DISPATCHER TOOLS</DrawerTitle>
              </div>
              <button
                onClick={() => setIsToolsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close Tool Drawer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 p-4 overflow-y-auto space-y-6 text-xs">
              {/* TOOL 1: GOOGLE MAPS STORE PINPOINTING */}
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-slate-200 font-bold text-xs">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <MapPin size={14} /> Interactive Google Maps Pinpointing
                  </span>
                  <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                    {pinpoints.length}/3 Stores
                  </span>
                </div>

                {/* INTERACTIVE GOOGLE MAPS DIV */}
                <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700 relative bg-slate-950">
                  <div ref={mapRef} className="w-full h-full" />
                  {!isMapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-[11px]">
                      Loading Google Maps...
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1 bg-slate-900/80 backdrop-blur-xs p-1 text-[9px] text-slate-300 text-center rounded">
                    💡 Click anywhere on map to drop store pin
                  </div>
                </div>

                {/* Optimized Store Name Search & Auto-Pin Form */}
                <form onSubmit={handleSearchAndPinStore} className="space-y-1">
                  <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Type store name (e.g. Mercury Drug)..."
                        value={searchStoreInput}
                        onChange={(e) => setSearchStoreInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                      {searchStoreInput && (
                        <button
                          type="button"
                          onClick={() => setSearchStoreInput("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={!searchStoreInput.trim() || isSearchingStore || pinpoints.length >= 3}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-3 py-2 rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition shrink-0"
                      title="Auto-search store & drop map pin"
                    >
                      {isSearchingStore ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <MapPin size={13} />
                      )}
                      <span>Pin Store</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>💡 Press Enter to auto-search & pin store, or click map directly.</span>
                  </p>
                </form>

                {/* Multi-Branch Store Selection Dropdown */}
                {searchResults.length > 0 && (
                  <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-2 space-y-1.5 shadow-xl animate-fade-in my-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 px-1">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                        📍 Multiple ({searchResults.length}) Branches Found - Select:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchResults([])}
                        className="text-slate-400 hover:text-white p-0.5 rounded"
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
                          className="w-full text-left bg-slate-900/90 hover:bg-blue-600/30 hover:border-blue-500/60 text-slate-200 p-2.5 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between transition group cursor-pointer shadow-xs"
                        >
                          <div>
                            <p className="font-bold text-slate-100 group-hover:text-blue-300 flex items-center gap-1.5">
                              <Compass size={13} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span>{res.name || res.formatted_address?.split(",")[0] || searchStoreInput}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[240px]">
                              {res.formatted_address}
                            </p>
                          </div>
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-1 rounded shrink-0 ml-2 border border-blue-400/30 group-hover:bg-blue-600 group-hover:text-white transition">
                            Hover & Pin
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Pinpoints List with Map Focus */}
                <div className="space-y-2 pt-1">
                  {pinpoints.length === 0 ? (
                    <p className="text-slate-400 text-[11px] italic">No store pins added yet. Search above or click Google Map to drop pins.</p>
                  ) : (
                    pinpoints.map((pin, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-700 hover:border-blue-500/50 transition group shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-100 text-xs">{pin.storeName}</p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFocusPinpoint(pin)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 p-1.5 rounded-lg transition"
                            title="Pan & Focus Map on this store"
                          >
                            <Target size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePinpoint(idx)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 p-1.5 rounded-lg transition"
                            title="Remove Store Pin"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Save & Broadcast Button */}
                <button
                  onClick={handleSaveAndSendMap}
                  disabled={isSavingPins || pinpoints.length === 0}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                >
                  <MapPin size={14} /> Send Pinpoint Map to Customer
                </button>

                {pinMessage && (
                  <p className="text-[11px] text-emerald-400 text-center font-semibold animate-fade-in">
                    {pinMessage}
                  </p>
                )}
              </div>

              {/* TOOL 2: ASSIGN RIDER TO ERRAND */}
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-3">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <UserCheck size={14} /> Assign Rider & Start Errand
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Assign an online rider to handle this customer's Pabili request. Moves order to "Doing Errand" queue.
                </p>
                <button
                  onClick={handleOpenAssignModal}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                >
                  <UserCheck size={16} /> Assign Rider Modal
                </button>
              </div>

              {/* TOOL 3: CLOSE CHAT (NO TRANSACTION / PASSING BY) */}
              <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 space-y-3">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <Slash size={14} /> Close Chat (No Transaction)
                </span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  If the customer is not proceeding with an order, close the session gracefully with status "Passing By".
                </p>
                <button
                  onClick={handleCloseChatPassingBy}
                  className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Slash size={14} /> Close Chat & Set "Passing By"
                </button>
              </div>
            </div>

            {/* ASSIGN RIDER DIALOG — nested inside the tools drawer's own
                DrawerContent so it joins the drawer's Base UI floating tree.
                A sibling rendered after </Drawer> gets marked inert by the
                drawer's FloatingFocusManager and is unclickable. */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
              <DialogContent>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <DialogTitle className="flex items-center gap-2">
                    <UserCheck className="text-emerald-600" size={20} /> Assign Rider to Order #{orderId}
                  </DialogTitle>
                  <DialogClose className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                    <X size={18} />
                  </DialogClose>
                </div>

                <p className="text-xs text-slate-500 leading-normal">
                  Select an online rider or use random assignment algorithm. Assigning a rider moves the order status to <span className="font-bold text-emerald-700">DOING ERRAND</span> and closes the chat.
                </p>

                {/* Riders List */}
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {onlineRiders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No online riders found in database.</p>
                  ) : (
                    onlineRiders.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                          String(selectedRiderId) === String(r.id)
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                            : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="riderSelect"
                            value={r.id}
                            checked={String(selectedRiderId) === String(r.id)}
                            onChange={() => setSelectedRiderId(String(r.id))}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <p className="font-bold text-xs">{r.name || `${r.firstName} ${r.lastName}`}</p>
                            <p className="text-[10px] text-slate-500">Phone: {r.phone || "0917-000-0000"}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          ONLINE
                        </span>
                      </label>
                    ))
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handleConfirmAssignRider(false)}
                    disabled={isAssigning || !selectedRiderId}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl shadow transition text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Confirm Assign Selected Rider
                  </button>

                  <button
                    onClick={() => handleConfirmAssignRider(true)}
                    disabled={isAssigning}
                    className="w-full bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-bold py-2.5 rounded-xl shadow transition text-xs flex items-center justify-center gap-2"
                  >
                    🎲 Random Rider Assignment Algorithm
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

