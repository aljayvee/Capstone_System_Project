import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue } from "firebase/database";
import { database } from "../../../firebase/config";
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
} from "lucide-react";

interface DispatcherChatPanelProps {
  orderId: string;
  dispatcher: any;
  onClose: () => void;
  onRefreshOrders?: () => void;
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

const TACURONG_PRESETS = [
  { storeName: "SM Supermarket Tacurong", latitude: 6.6715, longitude: 124.6648 },
  { storeName: "Mercury Drug - National Highway", latitude: 6.6702, longitude: 124.6635 },
  { storeName: "Robinsons Supermarket", latitude: 6.6728, longitude: 124.6659 },
  { storeName: "Watsons Pharmacy Tacurong", latitude: 6.6698, longitude: 124.6629 },
  { storeName: "Jollibee Tacurong Center", latitude: 6.6708, longitude: 124.6641 },
];

const BACKEND_URL = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace(/\/api$/, "")
  : "http://localhost:5000";

const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

export const DispatcherChatPanel: React.FC<DispatcherChatPanelProps> = ({
  orderId,
  dispatcher,
  onClose,
  onRefreshOrders,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Tools Panel state
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [pinpoints, setPinpoints] = useState<StorePinpoint[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  // Custom Search Input state for Google Maps
  const [searchStoreInput, setSearchStoreInput] = useState("");

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

  // Load Google Maps JavaScript API dynamically
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    if ((window as any).google && (window as any).google.maps) {
      setIsMapLoaded(true);
      return;
    }

    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.onload = () => {
      setIsMapLoaded(true);
    };
    script.onerror = (e) => {
      console.warn("Google Maps script load warning:", e);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize Google Maps instance when container and script are ready
  useEffect(() => {
    async function initGoogleMap() {
      if (!isMapLoaded || !mapRef.current || googleMapInstance.current) return;
      const g = (window as any).google;
      if (!g || !g.maps) return;

      try {
        let MapClass = g.maps.Map;
        if (!MapClass && g.maps.importLibrary) {
          const mapsLib = await g.maps.importLibrary("maps");
          MapClass = mapsLib?.Map;
        }

        if (!MapClass) {
          console.warn("Google Maps Map class not available.");
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
      } catch (err) {
        console.warn("Google Maps initialization exception caught:", err);
      }
    }

    initGoogleMap();
  }, [isMapLoaded]);

  // Update Google Maps markers when pinpoints array changes
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google) return;
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
        // Modern AdvancedMarkerElement
        const pinElement = new g.maps.marker.PinElement({
          glyph: String(idx + 1),
          glyphColor: "#FFFFFF",
          background: "#EF4444",
          borderColor: "#991B1B",
        });

        marker = new g.maps.marker.AdvancedMarkerElement({
          map: googleMapInstance.current,
          position: pos,
          title: titleStr,
          content: pinElement.element,
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

      marker.addListener("click", () => {
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

  // Load existing store pinpoints from MariaDB 3NF store_pinpoints table
  useEffect(() => {
    async function fetchPinpoints() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/pabili/${orderId}/pinpoints`);
        if (res.ok) {
          const data = await res.json();
          setPinpoints(data.pinpoints || []);
        }
      } catch (err) {
        console.warn("Failed to fetch pinpoints:", err);
      }
    }
    fetchPinpoints();
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
  const handleAddPresetPin = (preset: typeof TACURONG_PRESETS[0]) => {
    if (pinpoints.length >= 3) {
      alert("Maximum 3 store pinpoints allowed per errand request.");
      return;
    }
    setPinpoints((prev) => [...prev, { ...preset }]);
  };

  const handleRemovePinpoint = (index: number) => {
    setPinpoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Store Pinpoints & Broadcast to Customer
  const handleSaveAndSendMap = async () => {
    setIsSavingPins(true);
    setPinMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/pabili/${orderId}/pinpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinpoints }),
      });
      if (res.ok) {
        setPinMessage("✅ Store pinpoints sent to customer!");

        // Push chat notification to customer
        const messagesRef = ref(database, `chats/${orderId}/messages`);
        const storesList = pinpoints.map((p) => p.storeName).join(", ");
        push(messagesRef, {
          senderId: String(dispatcher?.id || "dispatcher-1"),
          senderName: dispatcherFirstName,
          role: "dispatcher",
          text: `📍 I have set the exact store locations for your errand: ${storesList || "Stores updated"}. You can view the Map Pinpoints in your app!`,
          timestamp: Date.now(),
        });

        setTimeout(() => setPinMessage(null), 4000);
      } else {
        alert("Failed to save store pinpoints.");
      }
    } catch (err) {
      alert("Error saving store pinpoints.");
    } finally {
      setIsSavingPins(false);
    }
  };

  // Close Chat with "Passing By" Status
  const handleCloseChatPassingBy = async () => {
    if (confirm("Close this chat without transaction? Order status will be updated to 'PASSING BY'.")) {
      try {
        await fetch(`${BACKEND_URL}/api/orders/pabili/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PASSING BY" }),
        });
        if (onRefreshOrders) onRefreshOrders();
      } catch (e) {}
      onClose();
    }
  };

  // Fetch online riders for modal
  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/riders/online`);
      if (res.ok) {
        const data = await res.json();
        setOnlineRiders(data.riders || []);
        if (data.riders && data.riders.length > 0) {
          setSelectedRiderId(String(data.riders[0].id));
        }
      }
    } catch (err) {
      console.warn("Error fetching online riders:", err);
    }
  };

  // Assign Rider (Random or Chosen) -> Status "DOING ERRAND"
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

      const res = await fetch(`${BACKEND_URL}/api/orders/pabili/${orderId}/assign-rider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ Rider ${data.order.riderName || "assigned"} is now DOING ERRAND for Order #${orderId}!`);
        
        // Push final notification message in chat
        const messagesRef = ref(database, `chats/${orderId}/messages`);
        push(messagesRef, {
          senderId: String(dispatcher?.id || "dispatcher-1"),
          senderName: dispatcherFirstName,
          role: "dispatcher",
          text: `🛵 Rider ${data.order.riderName} has been assigned to your errand and is now DOING ERRAND. Chat is closing now!`,
          timestamp: Date.now(),
        });

        if (onRefreshOrders) onRefreshOrders();
        setIsAssignModalOpen(false);
        onClose(); // Automatically close chat on assignment
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to assign rider.");
      }
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Main Drawer Container: Left Panel (Tools) + Right Panel (Chat) */}
      <div className="fixed right-0 top-0 bottom-0 z-50 flex shadow-2xl transition-all duration-300">
        
        {/* LEFT-SIDE DISPATCHER TOOL PANEL */}
        <div
          className={`${
            isToolsOpen ? "w-[340px]" : "w-0 overflow-hidden"
          } bg-slate-900 text-slate-100 border-l border-r border-slate-800 flex flex-col transition-all duration-300 relative`}
        >
          {/* Tool Panel Header */}
          <div className="p-4 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Compass size={18} />
              <span>DISPATCHER TOOLS</span>
            </div>
            <button
              onClick={() => setIsToolsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Minimize Tool Panel"
            >
              <ChevronRight size={18} />
            </button>
          </div>

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

              {/* Store Name Input for next pin */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Type Store Name before clicking map..."
                  value={searchStoreInput}
                  onChange={(e) => setSearchStoreInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Pinpoints List */}
              <div className="space-y-2">
                {pinpoints.length === 0 ? (
                  <p className="text-slate-400 text-[11px] italic">No store pins added yet. Click Google Map above or select presets.</p>
                ) : (
                  pinpoints.map((pin, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-700"
                    >
                      <div>
                        <p className="font-bold text-slate-200 text-xs">📍 Store #{idx + 1}: {pin.storeName}</p>
                        <p className="text-[10px] font-mono text-slate-400">
                          {Number(pin.latitude).toFixed(4)}, {Number(pin.longitude).toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemovePinpoint(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Tacurong Store Presets */}
              {pinpoints.length < 3 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Quick Add Tacurong Stores:</p>
                  <div className="space-y-1">
                    {TACURONG_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddPresetPin(preset)}
                        className="w-full text-left bg-slate-700/50 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-[11px] flex items-center justify-between transition"
                      >
                        <span>+ {preset.storeName}</span>
                        <Plus size={12} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
        </div>

        {/* Expand Tools Toggle if minimized */}
        {!isToolsOpen && (
          <button
            onClick={() => setIsToolsOpen(true)}
            className="bg-slate-900 text-rose-400 border-l border-slate-700 p-2 flex items-center justify-center hover:bg-slate-800 transition"
            title="Expand Dispatcher Tools"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* RIGHT PANEL: LIVE CHAT DRAWER */}
        <div className="w-[420px] bg-white flex flex-col border-l border-slate-200">
          {/* Panel Header */}
          <header className="bg-[#1E3A5F] text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-white">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Live Errand Chat</h3>
                <p className="text-xs text-blue-200 font-mono">Order #{orderId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
              title="Close Panel"
            >
              <X size={20} />
            </button>
          </header>

          {/* Message Log Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Loading chat messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 space-y-2">
                <MessageSquare size={32} className="text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">No messages yet</p>
                <p className="text-xs text-slate-400">
                  Send a message to discuss items or use the Dispatcher Tools on the left.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isDispatcher = m.role === "dispatcher";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      isDispatcher ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-400 mb-1 px-1">
                      {isDispatcher ? `${dispatcherFirstName} (You)` : m.senderName || "Customer"}
                    </span>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isDispatcher
                          ? "bg-[#1E3A5F] text-white rounded-br-none shadow-sm"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {formatTime(m.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
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
        </div>
      </div>

      {/* ASSIGN RIDER MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <UserCheck className="text-emerald-600" size={20} /> Assign Rider to Order #{orderId}
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      )}
    </>
  );
};

