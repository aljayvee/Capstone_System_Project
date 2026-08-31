import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "../../../services/apiClient";
import { loadGoogleMapsScript, importGoogleMapsLibrary } from "../../../utils/loadGoogleMaps";
import {
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Compass,
  ArrowLeft,
  Building2,
  Tag,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";

export interface PlaceCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface VerifiedPlace {
  id: string;
  name: string;
  categoryId: number;
  category?: PlaceCategory;
  address: string;
  barangay?: string | null;
  latitude: number;
  longitude: number;
  keywords?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PlacesDirectoryScreen() {
  const [places, setPlaces] = useState<VerifiedPlace[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");

  // Form State (Add / Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<number | "">("");
  const [formAddress, setFormAddress] = useState("");
  const [formBarangay, setFormBarangay] = useState("Poblacion");
  const [formLatitude, setFormLatitude] = useState<string>("6.6873");
  const [formLongitude, setFormLongitude] = useState<string>("124.6752");
  const [formKeywords, setFormKeywords] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Google Maps State
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const activeMarkerRef = useRef<any>(null);
  const allMarkersRef = useRef<any[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Fetch Places & Categories
  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
      // includeInactive: this directory is where a place is deactivated and
      // reactivated, so it must show retired rows. Without it, deactivating a
      // place would make it disappear from the only screen that could bring it
      // back. The server honours the flag for OWNER/DISPATCHER only, so it
      // stays hidden from the dispatcher store picker and the customer flow.
      const res = await apiClient.get("/places?includeInactive=true");
      setPlaces(res.data || []);
    } catch (err) {
      console.warn("Failed to fetch verified places:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/places/categories");
      setCategories(res.data || []);
      if (res.data && res.data.length > 0 && formCategoryId === "") {
        setFormCategoryId(res.data[0].id);
      }
    } catch (err) {
      console.warn("Failed to fetch merchant categories:", err);
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchCategories();
  }, []);

  // 2. Initialize Google Map
  useEffect(() => {
    let timer: any;

    async function initMap() {
      if (!mapRef.current) return;

      try {
        await loadGoogleMapsScript();
        const mapsLib = await importGoogleMapsLibrary("maps");
        await importGoogleMapsLibrary("marker");

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass || !mapRef.current) return;

        if (mapRef.current.children.length > 0 && googleMapInstance.current) {
          setIsMapReady(true);
          return;
        }

        const tacurongCenter = { lat: 6.6873, lng: 124.6752 };
        const map = new MapClass(mapRef.current, {
          center: tacurongCenter,
          zoom: 14,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
        });

        // Click anywhere on map to drop / update form GPS pin
        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setFormLatitude(lat.toFixed(6));
          setFormLongitude(lng.toFixed(6));
          updateActiveMarker(lat, lng);
        });

        googleMapInstance.current = map;
        setIsMapReady(true);
      } catch (err) {
        console.warn("Map initialization error:", err);
      }
    }

    timer = setTimeout(initMap, 200);
    return () => clearTimeout(timer);
  }, []);

  // Helper to update active form pin
  const updateActiveMarker = (lat: number, lng: number) => {
    if (!googleMapInstance.current || !(window as any).google) return;
    const g = (window as any).google;

    if (activeMarkerRef.current) {
      if (activeMarkerRef.current.setMap) activeMarkerRef.current.setMap(null);
      else activeMarkerRef.current.map = null;
      activeMarkerRef.current = null;
    }

    if (g.maps.marker && g.maps.marker.AdvancedMarkerElement) {
      const pinGlyph = new g.maps.marker.PinElement({
        background: "#EF4444",
        glyphColor: "#FFFFFF",
        borderColor: "#991B1B",
        scale: 1.2,
      });

      activeMarkerRef.current = new g.maps.marker.AdvancedMarkerElement({
        map: googleMapInstance.current,
        position: { lat, lng },
        title: "Selected Store Pin",
        content: pinGlyph.element,
        gmpDraggable: true,
      });

      activeMarkerRef.current.addListener("dragend", (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setFormLatitude(newLat.toFixed(6));
        setFormLongitude(newLng.toFixed(6));
      });
    } else {
      activeMarkerRef.current = new g.maps.Marker({
        map: googleMapInstance.current,
        position: { lat, lng },
        title: "Selected Store Pin",
        draggable: true,
      });

      activeMarkerRef.current.addListener("dragend", (e: any) => {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        setFormLatitude(newLat.toFixed(6));
        setFormLongitude(newLng.toFixed(6));
      });
    }
  };

  // Render all existing places markers as blue pins
  useEffect(() => {
    if (!googleMapInstance.current || !(window as any).google || !isMapReady) return;
    const g = (window as any).google;

    allMarkersRef.current.forEach((m) => {
      if (m.setMap) m.setMap(null);
      else m.map = null;
    });
    allMarkersRef.current = [];

    places.forEach((p) => {
      let marker: any;
      const pos = { lat: p.latitude, lng: p.longitude };

      if (g.maps.marker && g.maps.marker.AdvancedMarkerElement) {
        const pinGlyph = new g.maps.marker.PinElement({
          background: "#1E3A5F",
          glyphColor: "#FFFFFF",
          borderColor: "#0F172A",
          scale: 0.9,
        });

        marker = new g.maps.marker.AdvancedMarkerElement({
          map: googleMapInstance.current,
          position: pos,
          title: p.name,
          content: pinGlyph.element,
        });
      } else {
        marker = new g.maps.Marker({
          map: googleMapInstance.current,
          position: pos,
          title: p.name,
        });
      }

      marker.addListener("click", () => {
        handleEditPlace(p);
      });

      allMarkersRef.current.push(marker);
    });
  }, [places, isMapReady]);

  // Form Reset
  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormName("");
    setFormAddress("");
    setFormBarangay("Poblacion");
    setFormLatitude("6.6873");
    setFormLongitude("124.6752");
    setFormKeywords("");
    setFormIsActive(true);
    setFormError(null);
    if (categories.length > 0) setFormCategoryId(categories[0].id);

    if (activeMarkerRef.current) {
      if (activeMarkerRef.current.setMap) activeMarkerRef.current.setMap(null);
      else activeMarkerRef.current.map = null;
      activeMarkerRef.current = null;
    }
  };

  // Start Edit
  const handleEditPlace = (place: VerifiedPlace) => {
    setIsEditing(true);
    setEditingId(place.id);
    setFormName(place.name);
    setFormCategoryId(place.categoryId);
    setFormAddress(place.address);
    setFormBarangay(place.barangay || "Poblacion");
    setFormLatitude(place.latitude.toFixed(6));
    setFormLongitude(place.longitude.toFixed(6));
    setFormKeywords(place.keywords || "");
    setFormIsActive(place.isActive);
    setFormError(null);

    updateActiveMarker(place.latitude, place.longitude);

    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat: place.latitude, lng: place.longitude });
      googleMapInstance.current.setZoom(16);
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const latNum = parseFloat(formLatitude);
    const lngNum = parseFloat(formLongitude);

    if (!formName.trim()) {
      setFormError("Establishment name is required.");
      return;
    }
    if (!formCategoryId) {
      setFormError("Please select a merchant category.");
      return;
    }
    if (!formAddress.trim()) {
      setFormError("Address is required.");
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      setFormError("Please click on the map to set valid GPS coordinates.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        categoryId: Number(formCategoryId),
        address: formAddress.trim(),
        barangay: formBarangay.trim() || null,
        latitude: latNum,
        longitude: lngNum,
        keywords: formKeywords.trim() || null,
        isActive: formIsActive,
      };

      if (isEditing && editingId) {
        await apiClient.put(`/places/${editingId}`, payload);
      } else {
        await apiClient.post("/places", payload);
      }

      await fetchPlaces();
      resetForm();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save establishment details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Place
  const handleDeletePlace = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the verified places directory?`)) {
      return;
    }

    try {
      await apiClient.delete(`/places/${id}`);
      await fetchPlaces();
      if (editingId === id) resetForm();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete establishment.");
    }
  };

  // Focus Map on Place
  const handleFocusPlace = (place: VerifiedPlace) => {
    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat: place.latitude, lng: place.longitude });
      googleMapInstance.current.setZoom(17);
    }
  };

  // Filtered Places list
  const filteredPlaces = places.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    if (!matchesCat) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.barangay || "").toLowerCase().includes(q) ||
      (p.keywords || "").toLowerCase().includes(q) ||
      (p.category?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER                                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#1E3A5F] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <Link
            to="/owner"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft size={16} />
            <span>Back to Console</span>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-wide flex items-center gap-2">
              <Building2 size={22} className="text-amber-400" />
              <span>Tacurong City Verified Establishments Directory</span>
            </h1>
            <p className="text-xs text-blue-200/80">
              Pre-recorded Ground-Truth GPS Coordinates & Merchant POI Database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-white/10 text-xs font-mono font-bold px-3 py-1.5 rounded-full border border-white/20">
            📍 {places.length} Establishments Recorded
          </span>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN TWO-COLUMN WORKSPACE                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1800px] w-full mx-auto">
        {/* ── LEFT COLUMN: DIRECTORY TABLE & SEARCH (7 Cols) ────────── */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-140px)]">
          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search store name, address, keywords, or barangay..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                />
              </div>
              <button
                onClick={resetForm}
                className="px-3.5 py-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <Plus size={15} />
                <span>New Store Pin</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition shrink-0 ${
                  selectedCategory === "ALL"
                    ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                All ({places.length})
              </button>
              {categories.map((c) => {
                const count = places.filter((p) => p.categoryId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition shrink-0 ${
                      selectedCategory === c.id
                        ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Directory List Table */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center p-12 text-slate-400 space-y-2 flex-col">
                <Loader2 className="animate-spin text-[#1E3A5F]" size={28} />
                <p className="text-xs font-medium">Loading verified directory...</p>
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-2">
                <Building2 size={36} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No establishments found</p>
                <p className="text-xs text-slate-400">Try adjusting your search query or add a new place pin.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3.5">Establishment / Store</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Barangay & Address</th>
                    <th className="p-3.5">GPS Coordinates</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlaces.map((place) => {
                    const isCurrentEdit = isEditing && editingId === place.id;
                    return (
                      <tr
                        key={place.id}
                        className={`transition hover:bg-blue-50/50 ${
                          isCurrentEdit ? "bg-amber-50/80 border-l-4 border-l-amber-500" : ""
                        }`}
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <p className="flex items-center gap-1.5">
                            <span className="truncate max-w-[200px]">{place.name}</span>
                          </p>
                          {place.keywords && (
                            <p className="text-[10px] font-normal text-slate-400 truncate max-w-[200px] mt-0.5">
                              🏷️ {place.keywords}
                            </p>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-slate-200 whitespace-nowrap">
                            {place.category?.name || "General"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-[220px]">
                          <p className="font-semibold text-slate-800">{place.barangay || "Tacurong"}</p>
                          <p className="text-[10px] text-slate-500 truncate">{place.address}</p>
                        </td>
                        <td className="p-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleFocusPlace(place)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                            title="Focus on Map"
                          >
                            <Compass size={14} />
                          </button>
                          <button
                            onClick={() => handleEditPlace(place)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                            title="Edit Place"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePlace(place.id, place.name)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Delete Place"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: INTERACTIVE MAP & ADD/EDIT FORM (5 Cols) ─ */}
        <div className="xl:col-span-5 flex flex-col gap-4 h-[calc(100vh-140px)]">
          {/* Interactive Map Pin-Dropper */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[280px] shrink-0 relative">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-blue-700">
                <MapPin size={14} />
                <span>Interactive Map — Click anywhere to set exact GPS pin</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                Lat: {formLatitude} | Lng: {formLongitude}
              </span>
            </div>
            <div ref={mapRef} className="flex-1 w-full h-full min-h-[220px]" />
          </div>

          {/* Add / Edit Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white ${
                    isEditing ? "bg-amber-500" : "bg-[#1E3A5F]"
                  }`}
                >
                  {isEditing ? <Edit2 size={14} /> : <Plus size={14} />}
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  {isEditing ? "Edit Ground-Truth Establishment" : "Register New Establishment"}
                </h3>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                <X size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Store Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Store / Establishment Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chooks-to-Go Tacurong City Center"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                  />
                </div>

                {/* Category & Barangay */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Merchant Category *
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Barangay
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Poblacion, New Isabela"
                      value={formBarangay}
                      onChange={(e) => setFormBarangay(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Street Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Street Address / Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alunan Highway corner Bonifacio St"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                  />
                </div>

                {/* Coordinates (Lat / Lng) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Latitude (GPS) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="6.6873"
                      value={formLatitude}
                      onChange={(e) => setFormLatitude(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Longitude (GPS) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="124.6752"
                      value={formLongitude}
                      onChange={(e) => setFormLongitude(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {/* Search Keywords / Tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Search Aliases & Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. chooks, choox, lechon manok, roast chicken"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition flex items-center gap-2 ${
                    isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-[#1E3A5F] hover:bg-[#162D4A]"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  <span>{isEditing ? "Save Establishment Changes" : "Register Establishment Pin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
