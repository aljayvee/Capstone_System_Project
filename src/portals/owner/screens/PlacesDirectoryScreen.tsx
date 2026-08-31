import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
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
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { NotificationBell } from "../../../components/NotificationBell";
import { HeaderClock } from "../../../components/HeaderClock";

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

type PlaceSortField = "name" | "category" | "address" | "status" | "newest";
type SortDirection = "asc" | "desc";

export default function PlacesDirectoryScreen() {
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get("categoryId");

  const [places, setPlaces] = useState<VerifiedPlace[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">(
    urlCategoryId ? Number(urlCategoryId) : "ALL"
  );

  // Sorting state
  const [sortField, setSortField] = useState<PlaceSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Form State (Add / Edit Modal)
  const [showForm, setShowForm] = useState(false);
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
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (urlCategoryId) {
      const parsed = Number(urlCategoryId);
      if (!isNaN(parsed)) {
        setSelectedCategory(parsed);
      }
    }
  }, [urlCategoryId]);

  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
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
      const catList: PlaceCategory[] = res.data || [];
      setCategories(catList);
      if (catList.length > 0 && formCategoryId === "") {
        if (typeof selectedCategory === "number") {
          setFormCategoryId(selectedCategory);
        } else {
          setFormCategoryId(catList[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch merchant categories:", err);
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!showForm) {
      setIsMapReady(false);
      googleMapInstance.current = null;
      activeMarkerRef.current = null;
      return;
    }

    let timer: any;

    async function initMap() {
      if (!mapRef.current) return;

      try {
        await loadGoogleMapsScript();
        const mapsLib = await importGoogleMapsLibrary("maps");
        await importGoogleMapsLibrary("marker");

        const MapClass = mapsLib?.Map || (window as any).google?.maps?.Map;
        if (!MapClass || !mapRef.current) return;

        const currentLat = parseFloat(formLatitude) || 6.6873;
        const currentLng = parseFloat(formLongitude) || 124.6752;
        const centerPos = { lat: currentLat, lng: currentLng };

        const map = new MapClass(mapRef.current, {
          center: centerPos,
          zoom: 15,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
        });

        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setFormLatitude(lat.toFixed(6));
          setFormLongitude(lng.toFixed(6));
          updateActiveMarker(map, lat, lng);
        });

        googleMapInstance.current = map;
        setIsMapReady(true);
        updateActiveMarker(map, currentLat, currentLng);
      } catch (err) {
        console.warn("Map initialization error:", err);
      }
    }

    timer = setTimeout(initMap, 250);
    return () => clearTimeout(timer);
  }, [showForm]);

  const updateActiveMarker = (mapInst?: any, lat?: number, lng?: number) => {
    const map = mapInst || googleMapInstance.current;
    if (!map || !(window as any).google) return;
    const g = (window as any).google;

    const latVal = lat ?? (parseFloat(formLatitude) || 6.6873);
    const lngVal = lng ?? (parseFloat(formLongitude) || 124.6752);

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
        map: map,
        position: { lat: latVal, lng: lngVal },
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
        map: map,
        position: { lat: latVal, lng: lngVal },
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
    if (typeof selectedCategory === "number") {
      setFormCategoryId(selectedCategory);
    } else if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }

    if (activeMarkerRef.current) {
      if (activeMarkerRef.current.setMap) activeMarkerRef.current.setMap(null);
      else activeMarkerRef.current.map = null;
      activeMarkerRef.current = null;
    }
  };

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
    setShowForm(true);
  };

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
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save establishment details.");
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleColumnSort = (field: PlaceSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedPlaces = useMemo(() => {
    const filtered = places.filter((p) => {
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

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "category") {
        const catA = a.category?.name || "";
        const catB = b.category?.name || "";
        comparison = catA.localeCompare(catB);
      } else if (sortField === "address") {
        const addrA = `${a.barangay || ""} ${a.address}`;
        const addrB = `${b.barangay || ""} ${b.address}`;
        comparison = addrA.localeCompare(addrB);
      } else if (sortField === "status") {
        comparison = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
      } else if (sortField === "newest") {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [places, selectedCategory, search, sortField, sortDirection]);

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-hidden">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER WITH BACK LINK (STATIC NON-SCROLLING)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/owner?module=merchants"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-2 text-xs font-bold shadow-2xs"
            title="Back to Merchants & Places"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to Categories</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1E3A5F] text-white flex items-center justify-center font-bold shadow-xs">
              <MapPin size={20} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Verified Places Directory
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Tacurong City Verified Establishments & GPS Coordinates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HeaderClock />
          <NotificationBell />
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN WORKSPACE CONTENT (FILLS HEIGHT & CONFINES SCROLL)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col overflow-hidden">
        {/* DIRECTORY TABLE & SEARCH CONTAINER (Fills Height) */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Search, Filter & Sort Rail (STATIC NON-SCROLLING) */}
          <div className="shrink-0 p-2.5 sm:p-3 border-b border-slate-200 bg-slate-50 space-y-2.5 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search store name, address, keywords, or barangay..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                />
              </div>

              {/* Right Group: Sort Selector + New Pin Button */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Sort Selector Dropdown */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                  <ArrowUpDown size={13} className="text-slate-400" />
                  <span className="text-[10.5px] font-bold text-slate-500">Sort:</span>
                  <select
                    value={`${sortField}-${sortDirection}`}
                    onChange={(e) => {
                      const [f, d] = e.target.value.split("-") as [PlaceSortField, SortDirection];
                      setSortField(f);
                      setSortDirection(d);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="name-asc">Store Name (A → Z)</option>
                    <option value="name-desc">Store Name (Z → A)</option>
                    <option value="category-asc">Category (A → Z)</option>
                    <option value="category-desc">Category (Z → A)</option>
                    <option value="address-asc">Barangay / Address (A → Z)</option>
                    <option value="status-asc">Active First</option>
                    <option value="status-desc">Retired First</option>
                    <option value="newest-asc">Recently Registered</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus size={15} />
                  <span>Register Store Pin</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition shrink-0 ${
                  selectedCategory === "ALL"
                    ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                All Categories ({places.length})
              </button>
              {categories.map((c) => {
                const count = places.filter((p) => p.categoryId === c.id).length;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition shrink-0 ${
                      selectedCategory === c.id
                        ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Directory List Table - ONLY THIS SECTION SCROLLS! */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative scrollbar-thin">
            {isLoading ? (
              <div className="h-full min-h-[300px] flex items-center justify-center p-12 text-slate-400 space-y-3 flex-col">
                <Loader2 className="animate-spin text-[#1E3A5F]" size={32} />
                <p className="text-xs font-medium">Loading verified directory...</p>
              </div>
            ) : sortedPlaces.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-3">
                <Building2 size={40} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No establishments found</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {places.length === 0
                    ? "No location store pins have been registered yet. Click 'Register Store Pin' to add one."
                    : "No places match your active search or category filter."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200 sticky top-0 z-10 select-none shadow-xs backdrop-blur-md">
                  <tr>
                    <th
                      onClick={() => handleColumnSort("name")}
                      className="p-4 cursor-pointer hover:bg-slate-200/70 transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Establishment / Store</span>
                        {sortField === "name" ? (
                          sortDirection === "asc" ? <ArrowUp size={13} className="text-blue-700" /> : <ArrowDown size={13} className="text-blue-700" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleColumnSort("category")}
                      className="p-4 cursor-pointer hover:bg-slate-200/70 transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Category</span>
                        {sortField === "category" ? (
                          sortDirection === "asc" ? <ArrowUp size={13} className="text-blue-700" /> : <ArrowDown size={13} className="text-blue-700" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleColumnSort("address")}
                      className="p-4 cursor-pointer hover:bg-slate-200/70 transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Barangay & Address</span>
                        {sortField === "address" ? (
                          sortDirection === "asc" ? <ArrowUp size={13} className="text-blue-700" /> : <ArrowDown size={13} className="text-blue-700" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="p-4">GPS Coordinates</th>
                    <th
                      onClick={() => handleColumnSort("status")}
                      className="p-4 cursor-pointer hover:bg-slate-200/70 transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortField === "status" ? (
                          sortDirection === "asc" ? <ArrowUp size={13} className="text-blue-700" /> : <ArrowDown size={13} className="text-blue-700" />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPlaces.map((place) => {
                    const isCurrentEdit = isEditing && editingId === place.id;
                    return (
                      <tr
                        key={place.id}
                        className={`transition hover:bg-blue-50/40 ${
                          isCurrentEdit ? "bg-amber-50/80 border-l-4 border-l-amber-500" : ""
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-900">
                          <p className="flex items-center gap-2">
                            <span className="truncate max-w-[240px] text-sm text-slate-900 font-extrabold">
                              {place.name}
                            </span>
                          </p>
                          {place.keywords && (
                            <p className="text-[11px] font-normal text-slate-400 truncate max-w-[240px] mt-0.5">
                              🏷️ {place.keywords}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg text-[10px] border border-blue-200 whitespace-nowrap">
                            {place.category?.name || "General"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 max-w-[260px]">
                          <p className="font-bold text-slate-800">{place.barangay || "Tacurong City"}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{place.address}</p>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              place.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {place.isActive ? "Active" : "Retired"}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleEditPlace(place)}
                            className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition border border-transparent hover:border-amber-200"
                            title="Edit Store Details"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePlace(place.id, place.name)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition border border-transparent hover:border-red-200"
                            title="Delete Store Pin"
                          >
                            <Trash2 size={15} />
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
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT ESTABLISHMENT MODAL DIALOG                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative border border-slate-200">
            {/* Modal Close Button */}
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-md text-slate-400 hover:text-slate-700 z-20 border border-slate-200 hover:bg-white transition"
              title="Close Dialog"
            >
              <X size={18} />
            </button>

            {/* Left Side: Interactive Map Pin-Dropper */}
            <div className="flex-1 flex flex-col h-72 md:h-auto min-h-[300px] border-b md:border-b-0 md:border-r border-slate-200 relative bg-slate-100">
              <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <MapPin size={15} />
                  <span>Interactive Map — Click to drop pin</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {formLatitude}, {formLongitude}
                </span>
              </div>
              <div ref={mapRef} className="flex-1 w-full h-full min-h-[240px]" />
            </div>

            {/* Right Side: Form Inputs */}
            <div className="w-full md:w-[460px] p-6 flex flex-col overflow-y-auto max-h-[60vh] md:max-h-[92vh] shrink-0 bg-white">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    isEditing ? "bg-amber-500" : "bg-[#1E3A5F]"
                  }`}
                >
                  {isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {isEditing ? "Edit Location Store Pin" : "Register Location Store Pin"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Ground-truth GPS coordinate mapping
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Store Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Store / Establishment Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jollibee Tacurong Highway"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
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
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
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
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
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
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
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
                        className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
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
                      placeholder="e.g. jollibee, burger, chickenjoy, fastfood"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:bg-white transition"
                    />
                  </div>

                  {/* Active / Retired status */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Store Availability Status
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormIsActive(true)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          formIsActive
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(false)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          !formIsActive
                            ? "bg-slate-700 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Retired / Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
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
                    <span>{isEditing ? "Save Store Changes" : "Register Store Pin"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
