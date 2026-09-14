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
  User,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Navigation,
  X,
  Compass,
  Layers,
} from "lucide-react";
import { importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import { toast } from "sonner";

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

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
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
      const titleStr = `Customer Drop-off: ${deliveryAddress}`;

      if (markerLib?.AdvancedMarkerElement && g.maps.marker?.PinElement) {
        const pinElement = new g.maps.marker.PinElement({
          glyphText: "🏠",
          glyphColor: "#FFFFFF",
          background: "#059669",
          borderColor: "#065F46",
        });

        marker = new markerLib.AdvancedMarkerElement({
          map,
          position: pos,
          title: titleStr,
          content: pinElement,
        });
      } else {
        marker = new g.maps.Marker({
          position: pos,
          map,
          title: titleStr,
          icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
          },
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-full p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin size={18} />
            </span>
            <div>
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Customer Delivery Location</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Drop-off Pin
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Exact destination coordinates and address provided by {customerName}.
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer">
            <X size={16} />
          </DialogClose>
        </DialogHeader>

        {/* Map Header Controls / Provider Switcher */}
        <div className="bg-slate-100/90 px-4 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-600">
            <Layers size={13} className="text-slate-500" />
            <span>Interactive Map View</span>
          </div>

          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs text-[11px]">
            <button
              type="button"
              onClick={() => setMapProvider("osm")}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                mapProvider === "osm"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              OpenStreetMap
            </button>
            <button
              type="button"
              onClick={() => setMapProvider("google")}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                mapProvider === "google"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Google Maps
            </button>
          </div>
        </div>

        {/* Embedded Interactive Map Container */}
        <div className="relative w-full h-64 sm:h-72 bg-slate-100 border-b border-slate-200">
          {mapProvider === "osm" ? (
            <iframe
              title="Customer Delivery Pinpoint Map"
              src={osmEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
            />
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
          )}

          {!isMapReady && mapProvider === "google" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-medium">
              <Loader2 size={18} className="animate-spin mr-2 text-emerald-600" />
              <span>Loading Google Maps pinpoint...</span>
            </div>
          )}

          {/* Floating Pin Indicator Pill */}
          <div className="absolute bottom-2.5 left-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Drop-off Destination Pinned</span>
          </div>
        </div>

        {/* Location & Recipient Details Box */}
        <div className="p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
          {/* Address Card */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Drop-off Address
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                    {deliveryAddress}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(deliveryAddress, "address")}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer shrink-0"
                title="Copy address"
              >
                {copiedField === "address" ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            {/* Coordinates Row */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1.5 border-t border-slate-100">
              <span>
                Coordinates: {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(`${activeLat}, ${activeLng}`, "coordinates")}
                className="text-blue-600 hover:text-blue-800 font-sans font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copiedField === "coordinates" ? "Copied!" : "Copy GPS"}
              </button>
            </div>
          </div>

          {/* Customer Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <User size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase">Recipient</p>
                <p className="font-bold text-slate-800 truncate">{customerName}</p>
              </div>
            </div>

            {customerPhone ? (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">Contact</p>
                    <p className="font-bold font-mono text-slate-800 truncate">{customerPhone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(customerPhone, "phone")}
                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer shrink-0"
                  title="Copy phone number"
                >
                  {copiedField === "phone" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Compass size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase">Area</p>
                  <p className="font-bold text-slate-800 truncate">Tacurong Service Zone</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-dispatcher-navy bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Open in Google Maps</span>
          </a>

          <div className="flex items-center gap-2">
            {onFocusInTools && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFocusInTools();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs active:scale-95"
              >
                <Navigation size={13} className="text-emerald-600" />
                <span>Focus in Tools</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
