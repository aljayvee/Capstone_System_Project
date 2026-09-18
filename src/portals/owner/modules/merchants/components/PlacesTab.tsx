import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router";
import { ConfirmDialog } from "@/components/panel";
import { apiClient } from "../../../../../services/apiClient";
import { loadGoogleMapsScript, importGoogleMapsLibrary } from "../../../../../utils/loadGoogleMaps";
import { GOOGLE_MAP_ID, canUseAdvancedMarkers } from "../../../../../utils/googleMapId";
import {
  findDuplicatePlace,
  describePlaceDuplicate,
  type PlaceDuplicateWarning,
} from "../../../../../utils/placeDuplicates";
import {
  MapPin,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";

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

interface PlacesTabProps {
  categories?: PlaceCategory[];
  preSelectedCategory?: number | "ALL";
}

type PlaceSortField = "name" | "category" | "address" | "status" | "newest";
type SortDirection = "asc" | "desc";

export default function PlacesTab({
  categories: initialCategories,
  preSelectedCategory,
}: PlacesTabProps) {
  const [searchParams] = useSearchParams();
  const urlCategoryId = searchParams.get("categoryId");

  const [places, setPlaces] = useState<VerifiedPlace[]>([]);
  const [categories, setCategories] = useState<PlaceCategory[]>(initialCategories || []);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * Set when the directory itself could not be read, cleared on success.
   *
   * Both of this screen's fetches used to swallow their failure into a
   * `console.warn` and leave state at `[]`, so a dead `/places` rendered the
   * EMPTY state: "No verified places yet." over a directory that might hold
   * hundreds. The category fetch failing was worse still, because it left the
   * create/edit modal with a required "Merchant Category" select containing
   * zero options and no explanation.
   */
  /**
   * Two fetches, two errors, deliberately not one.
   *
   * These used to share a single `loadError`, and because fetchCategories
   * runs after fetchPlaces it OVERWROTE the directory's own message. The
   * visible result was the failure panel on a screen headed VERIFIED PLACES
   * DIRECTORY reading "The merchant categories did not load" - the wrong
   * noun for the thing that failed, on a screen about pinned stores.
   *
   * They also have different consequences. No places means there is no list.
   * No categories means the list is fine but the filter rail is empty and the
   * register/edit form has no options for a required field. Reporting them
   * separately is what lets each say the true thing.
   */
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  /** Set when Google Maps could not start, so the pin box says why. */
  const [mapError, setMapError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">(
    preSelectedCategory ?? (urlCategoryId ? Number(urlCategoryId) : "ALL"),
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
  /**
   * A save held back because the place looks like one already in the directory.
   * Held rather than blocked - a mall really can hold two shops a few metres
   * apart, and the owner is the one who can tell.
   */
  const [duplicateWarning, setDuplicateWarning] = useState<PlaceDuplicateWarning | null>(null);

  // Google Maps State
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const activeMarkerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (preSelectedCategory !== undefined) {
      setSelectedCategory(preSelectedCategory);
    } else if (urlCategoryId) {
      const parsed = Number(urlCategoryId);
      if (!isNaN(parsed)) {
        setSelectedCategory(parsed);
      }
    }
  }, [preSelectedCategory, urlCategoryId]);

  const fetchPlaces = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get("/places?includeInactive=true");
      setPlaces(res.data || []);
      setPlacesError(null);
    } catch (err) {
      console.warn("Failed to fetch verified places:", err);
      // A rejected request is not an empty directory. Recording it is what
      // stops PanelState rendering the empty state over a failure.
      setPlacesError("The verified places directory did not load.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get("/places/categories");
      const catList: PlaceCategory[] = res.data || [];
      setCategories(catList);
      setCategoriesError(null);
      if (catList.length > 0 && formCategoryId === "") {
        if (typeof selectedCategory === "number") {
          setFormCategoryId(selectedCategory);
        } else {
          setFormCategoryId(catList[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch merchant categories:", err);
      // Its own channel. Without this the category pill rail is silently
      // empty and the modal's required select has no options, and reporting
      // it through the directory's error made the panel name the wrong thing.
      setCategoriesError("The merchant categories did not load.");
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchCategories();
  }, []);

  // Initialize Google Map when Modal opens
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

        const googleMapId = GOOGLE_MAP_ID;
        const mapOptions: any = {
          center: centerPos,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        };
        if (googleMapId) {
          mapOptions.mapId = googleMapId;
        }

        const map = new MapClass(mapRef.current, mapOptions);

        map.addListener("click", (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setFormLatitude(lat.toFixed(6));
          setFormLongitude(lng.toFixed(6));
          updateActiveMarker(map, lat, lng);
        });

        googleMapInstance.current = map;
        setIsMapReady(true);
        setMapError(null);
        updateActiveMarker(map, currentLat, currentLng);
      } catch (err) {
        console.warn("Map initialization error:", err);
        // The pin box is a blank grey rectangle under a label that promises
        // an interactive map. Saying so beats leaving the owner to guess
        // whether they are supposed to click it.
        setMapError("The map did not load. Enter the coordinates by hand below.");
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

    if (canUseAdvancedMarkers(g)) {
      const pinGlyph = new g.maps.marker.PinElement({
        // The Google Maps marker API takes literals, so these cannot be
        // token utilities. They are the signal red and its deep hover from
        // tailwind.css, written out, so a pin matches every other place this
        // portal spends red rather than being a fourth shade of it.
        background: "#DC2626",
        glyphColor: "#FFFFFF",
        borderColor: "#C62828",
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

  // A warning only licenses saving THIS place at THIS spot. Editing the name or
  // moving the pin makes it stale, so it clears and the next save re-checks -
  // otherwise one dismissed warning would wave through every later edit too.
  useEffect(() => {
    setDuplicateWarning(null);
  }, [formName, formLatitude, formLongitude]);

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

    // Nothing stops the same shop being registered twice - the table has no
    // uniqueness of any kind and the API does no pre-existence check - and a
    // duplicate then splits the dispatcher's store search, the reverse lookup
    // and the wrong-branch check between two rows. Warn once; a second press
    // saves anyway.
    if (!duplicateWarning) {
      const clash = findDuplicatePlace(
        { name: formName.trim(), latitude: latNum, longitude: lngNum },
        places,
        isEditing ? editingId : null,
      );
      if (clash) {
        setDuplicateWarning(clash);
        return;
      }
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
      setDuplicateWarning(null);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to save establishment details.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * The store the owner has asked to delete, or null.
   *
   * This was a `window.confirm` whose rejection path reported failure through
   * a bare `alert()`, so the only feedback a failed delete ever produced was
   * a browser-chrome box with no product voice, and the screen behind it was
   * left looking as though nothing had been attempted.
   */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeletePlace = (id: string, name: string) => {
    setDeleteError(null);
    setPendingDelete({ id, name });
  };

  const confirmDeletePlace = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/places/${id}`);
      await fetchPlaces();
      if (editingId === id) resetForm();
      setPendingDelete(null);
    } catch (err: any) {
      // Stays on screen, in the product's own voice, rather than an alert()
      // the owner dismisses and then cannot re-read.
      setDeleteError(
        err.response?.data?.message ||
          "That store could not be deleted. It is still in the directory.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle column sort
  /**
   * A sortable column head that a keyboard can actually reach.
   *
   * These four headers were bare `th` elements with an onClick, a
   * cursor-pointer class, and no tabIndex, role or key handler, so the whole
   * sort control was mouse-only. `UserManagementModule` already implements
   * this correctly as a real button, and this follows it with one correction:
   * `aria-sort` belongs on the header cell, the element with the columnheader
   * role, not on the button nested inside it.
   */
  const SortTh: React.FC<{ field: PlaceSortField; label: string }> = ({ field, label }) => {
    const isActive = sortField === field;
    const Icon = !isActive ? ArrowUpDown : sortDirection === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        className="p-0"
      >
        <button
          type="button"
          onClick={() => handleColumnSort(field)}
          title={`Sort by ${label}`}
          className="group flex w-full items-center gap-1.5 p-4 text-left uppercase transition-colors hover:bg-board-ground"
        >
          <span>{label}</span>
          <Icon
            size={13}
            className={isActive ? "text-ink" : "text-ink-muted opacity-0 group-hover:opacity-100"}
          />
        </button>
      </th>
    );
  };

  const handleColumnSort = (field: PlaceSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered and Sorted Places
  // Retired stores live in the Archive tab and nowhere else. Without this they
  // would still be listed here, and "archived" would mean nothing more than a
  // grey badge on a row that never went anywhere.
  const livePlaces = useMemo(() => places.filter((p) => p.isActive), [places]);

  // Nothing may report a confident count while the panel below reports that
  // the fetch failed. Every rendered count on this screen goes through fig().
  const unknown = placesError !== null && places.length === 0;
  const fig = (n: number) => (unknown ? "--" : String(n));

  const sortedPlaces = useMemo(() => {
    const filtered = livePlaces.filter((p) => {
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
  }, [livePlaces, selectedCategory, search, sortField, sortDirection]);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
      {/* DIRECTORY TABLE & SEARCH CONTAINER (Fills Height) */}
      <div className="flex-1 min-h-0 bg-board-plate rounded-plate border border-edge flex flex-col overflow-hidden">
        {/* Search, Filter & Sort Rail (STATIC NON-SCROLLING) */}
        <div className="shrink-0 p-2.5 sm:p-3 border-b border-edge bg-board-ground space-y-2.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                size={15}
              />
              <input
                type="text"
                placeholder="Search store name, address, keywords, or barangay..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-board-plate border border-edge rounded-plate text-body text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-board-field transition"
              />
            </div>

            {/* Right Group: Sort Selector + New Pin Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-board-plate border border-edge px-2.5 py-1 rounded-plate">
                <ArrowUpDown size={13} className="text-ink-muted" />
                <span className="text-label text-ink-muted">Sort:</span>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [f, d] = e.target.value.split("-") as [PlaceSortField, SortDirection];
                    setSortField(f);
                    setSortDirection(d);
                  }}
                  className="bg-transparent text-label text-ink cursor-pointer"
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
                className="px-3.5 py-1.5 bg-board-field hover:bg-board-field-deep text-white text-label rounded-plate transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={15} />
                <span>Register Store Pin</span>
              </button>
            </div>
          </div>

          {/* Reported where it bites. A missing category list does not stop
              the directory listing stores, so it does not belong in the
              directory's failure panel - but it does leave this rail with
              nothing but "All Categories" and the register form with no
              options for a required field, and silently. */}
          {categoriesError ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 rounded-plate border border-status-waiting-ink/20 bg-status-waiting-fill px-3 py-1.5 text-label text-status-waiting-ink"
            >
              <AlertCircle size={14} className="shrink-0" />
              {categoriesError} You can still read the directory, but it cannot be filtered by
              category and a new store pin cannot be assigned one.
            </p>
          ) : null}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-2.5 py-0.5 rounded-full text-label border border-edge transition shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-board-field text-white border-board-field"
                  : "bg-board-plate text-ink-muted border-edge hover:bg-board-ground"
              }`}
            >
              All Categories ({fig(places.length)})
            </button>
            {categories.map((c) => {
              const count = livePlaces.filter((p) => p.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-2.5 py-0.5 rounded-full text-label border border-edge transition shrink-0 ${
                    selectedCategory === c.id
                      ? "bg-board-field text-white border-board-field"
                      : "bg-board-plate text-ink-muted border-edge hover:bg-board-ground"
                  }`}
                >
                  {c.name} ({fig(count)})
                </button>
              );
            })}
          </div>
        </div>

        {/* Directory List Table - ONLY THIS SECTION SCROLLS! */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative">
          {isLoading ? (
            <div className="h-full min-h-[300px] flex items-center justify-center p-12 text-ink-muted space-y-3 flex-col">
              <Loader2 className="animate-spin text-board-field" size={32} />
              <p className="text-body">Loading verified directory...</p>
            </div>
          ) : places.length === 0 && placesError ? (
            /* Ordered before the empty branch. Without this the directory
               announced "No location store pins have been registered yet."
               over a failed request, which is a claim about the business
               rather than about the fetch. */
            <div
              role="alert"
              className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-3 p-12 text-center"
            >
              <AlertCircle size={22} className="text-status-act-ink" />
              <p className="text-panel text-ink">The directory did not load</p>
              <p className="max-w-sm text-body text-ink-muted">
                {placesError} Nothing is listed because nothing arrived, not because nothing is
                pinned.
              </p>
              <button
                type="button"
                onClick={() => {
                  void fetchPlaces();
                  void fetchCategories();
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-plate bg-signal px-4 text-micro uppercase text-board-plate transition-colors hover:bg-signal-deep"
              >
                <RotateCcw size={14} />
                <span>Try again</span>
              </button>
            </div>
          ) : sortedPlaces.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-12 text-ink-muted space-y-3">
              <Building2 size={40} className="text-ink-muted" />
              <p className="text-label text-ink">No establishments found</p>
              <p className="text-label text-ink-muted max-w-sm">
                {places.length === 0
                  ? "No location store pins have been registered yet. Click 'Register Store Pin' to add one."
                  : "No places match your active search or category filter."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-label">
              {/* removed: the header is opaque (bg-board-ground), so
                  it was blurring nothing while breaching the [LOCKED] flat
                  invariant. text-label was below the 12px floor. */}
              <thead className="sticky top-0 z-10 select-none border-b border-edge bg-board-ground text-micro uppercase text-ink-muted">
                <tr>
                  <SortTh field="name" label="Establishment / Store" />
                  <SortTh field="category" label="Category" />
                  <SortTh field="address" label="Barangay & Address" />
                  <th scope="col" className="p-4">
                    GPS Coordinates
                  </th>
                  <SortTh field="status" label="Status" />
                  <th scope="col" className="p-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {sortedPlaces.map((place) => {
                  const isCurrentEdit = isEditing && editingId === place.id;
                  return (
                    /* The 4px amber left border is gone. The detector calls a
                       thick coloured side border the most recognisable tell of
                       generated UI, and it was redundant here: the row already
                       carries the waiting fill, which is the status law's way
                       of saying this record is mid-edit. */
                    <tr
                      key={place.id}
                      className={`transition hover:bg-board-ground ${
                        isCurrentEdit ? "bg-status-waiting-fill text-status-waiting-ink" : ""
                      }`}
                    >
                      <td className="p-4 font-bold text-ink">
                        <p className="flex items-center gap-2">
                          <span className="truncate max-w-[240px] text-label text-ink">
                            {place.name}
                          </span>
                        </p>
                        {place.keywords && (
                          <p className="text-body text-ink-muted truncate max-w-[240px] mt-0.5">
                            {place.keywords}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="bg-board-ground text-ink px-2.5 py-1 rounded-trim text-label border border-edge whitespace-nowrap">
                          {place.category?.name || "General"}
                        </span>
                      </td>
                      <td className="p-4 text-ink-muted max-w-[260px]">
                        <p className="font-bold text-ink">{place.barangay || "Tacurong City"}</p>
                        <p className="text-label text-ink-muted truncate mt-0.5">{place.address}</p>
                      </td>
                      <td className="p-4 font-mono text-label text-ink-muted whitespace-nowrap">
                        {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-micro uppercase border border-edge ${
                            place.isActive
                              ? "bg-status-done-fill text-status-done-ink "
                              : "bg-board-ground text-ink-muted border-edge"
                          }`}
                        >
                          {place.isActive ? "Active" : "Retired"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleEditPlace(place)}
                          className="p-2 text-status-waiting-ink hover:bg-status-waiting-fill rounded-plate transition-colors border border-transparent hover:border-status-waiting-ink/40"
                          title="Edit Store Details"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeletePlace(place.id, place.name)}
                          className="p-2 text-status-act-ink hover:bg-status-act-fill rounded-plate transition-colors border border-transparent hover:border-status-act-ink/40"
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

      {/* ADD / EDIT ESTABLISHMENT MODAL DIALOG */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 animate-fade-in">
          <div className="bg-board-plate rounded-plate w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden relative border border-edge">
            {/* Modal Close Button */}
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="absolute top-4 right-4 p-2 bg-board-plate rounded-full text-ink-muted hover:text-ink z-20 border border-edge hover:bg-board-plate transition"
              title="Close Dialog"
            >
              <X size={18} />
            </button>

            {/* Left Side: Interactive Map Pin-Dropper */}
            <div className="flex-1 flex flex-col h-72 md:h-auto min-h-[300px] border-b md:border-b-0 md:border-r border-edge relative bg-board-ground">
              <div className="px-4 py-3 bg-board-ground border-b border-edge flex items-center justify-between text-label text-ink">
                {/* The label no longer promises an interaction the map may
                    not be able to offer, and the em dash is gone with it. */}
                <span className="flex items-center gap-1.5 text-ink">
                  <MapPin size={15} />
                  <span>
                    {mapError
                      ? "Map unavailable"
                      : isMapReady
                        ? "Interactive map, click to drop a pin"
                        : "Loading the map"}
                  </span>
                </span>
                <span className="font-mono text-label text-ink-muted bg-board-plate px-2 py-0.5 rounded border border-edge">
                  {formLatitude}, {formLongitude}
                </span>
              </div>
              <div ref={mapRef} className="flex-1 w-full h-full min-h-[240px]" />
              {/* isMapReady was computed and set here and read nowhere, so a
                  Google Maps failure left a blank grey rectangle with no
                  explanation. Both states are now visible, over the map
                  container rather than replacing it, because the map may
                  still arrive. */}
              {mapError ? (
                <div
                  role="alert"
                  className="pointer-events-none absolute inset-x-4 bottom-4 rounded-plate bg-status-act-fill px-3 py-2 text-label text-status-act-ink"
                >
                  {mapError}
                </div>
              ) : !isMapReady ? (
                <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-plate bg-status-closed-fill px-3 py-2 text-label text-status-closed-ink">
                  Loading the map. The coordinate fields below work either way.
                </div>
              ) : null}
            </div>

            {/* Right Side: Form Inputs */}
            <div className="w-full md:w-[460px] p-6 flex flex-col overflow-y-auto max-h-[60vh] md:max-h-[92vh] shrink-0 bg-board-plate">
              <div className="flex items-center gap-2.5 pb-4 border-b border-hairline mb-4">
                <div
                  className={`w-9 h-9 rounded-plate flex items-center justify-center font-bold text-white ${
                    isEditing ? "bg-status-waiting-ink" : "bg-board-field"
                  }`}
                >
                  {isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                <div>
                  <h3 className=" text-ink text-label">
                    {isEditing ? "Edit Location Store Pin" : "Register Location Store Pin"}
                  </h3>
                  <p className="text-body text-ink-muted">Ground-truth GPS coordinate mapping</p>
                </div>
              </div>

              {duplicateWarning && (
                <div className="mb-4 p-3 bg-status-waiting-fill border border-status-waiting-ink/20 rounded-plate text-label text-status-waiting-ink flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold m-0">{describePlaceDuplicate(duplicateWarning)}</p>
                    <p className="m-0 mt-1 opacity-80">
                      Press Save again to add it anyway, or change the name and location.
                    </p>
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-4 p-3 bg-status-act-fill border border-status-act-ink/20 rounded-plate text-label text-status-act-ink flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-4 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Store Name */}
                  <div>
                    <label className="block text-micro text-ink uppercase mb-1">
                      Store / Establishment Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jollibee Tacurong Highway"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-board-ground border border-edge rounded-plate text-body text-ink focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                    />
                  </div>

                  {/* Category & Barangay */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-micro text-ink uppercase mb-1">
                        Merchant Category *
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-board-ground border border-edge rounded-plate text-body text-ink focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-micro text-ink uppercase mb-1">Barangay</label>
                      <input
                        type="text"
                        placeholder="e.g. Poblacion, New Isabela"
                        value={formBarangay}
                        onChange={(e) => setFormBarangay(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-board-ground border border-edge rounded-plate text-body text-ink focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="block text-micro text-ink uppercase mb-1">
                      Street Address / Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alunan Highway corner Bonifacio St"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-board-ground border border-edge rounded-plate text-body text-ink focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                    />
                  </div>

                  {/* Coordinates (Lat / Lng) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-micro text-ink uppercase mb-1">
                        Latitude (GPS) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="6.6873"
                        value={formLatitude}
                        onChange={(e) => setFormLatitude(e.target.value)}
                        className="w-full px-3.5 py-2 bg-board-ground border border-edge rounded-plate text-label font-mono text-ink focus:bg-board-plate"
                      />
                    </div>
                    <div>
                      <label className="block text-micro text-ink uppercase mb-1">
                        Longitude (GPS) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="124.6752"
                        value={formLongitude}
                        onChange={(e) => setFormLongitude(e.target.value)}
                        className="w-full px-3.5 py-2 bg-board-ground border border-edge rounded-plate text-label font-mono text-ink focus:bg-board-plate"
                      />
                    </div>
                  </div>

                  {/* Search Keywords / Tags */}
                  <div>
                    <label className="block text-micro text-ink uppercase mb-1">
                      Search Aliases & Keywords (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. jollibee, burger, chickenjoy, fastfood"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-board-ground border border-edge rounded-plate text-body text-ink focus:outline-none focus:ring-2 focus:ring-board-field focus:bg-board-plate transition"
                    />
                  </div>

                  {/* Active / Retired status */}
                  <div>
                    <label className="block text-micro text-ink uppercase mb-1">
                      Store Availability Status
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormIsActive(true)}
                        className={`px-3.5 py-1.5 rounded-plate text-label transition ${
                          formIsActive
                            ? "bg-status-done-ink text-white"
                            : "bg-board-ground text-ink-muted hover:bg-board-ground"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(false)}
                        className={`px-3.5 py-1.5 rounded-plate text-label transition ${
                          !formIsActive
                            ? "bg-board-field text-white"
                            : "bg-board-ground text-ink-muted hover:bg-board-ground"
                        }`}
                      >
                        Retired / Inactive
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-4 border-t border-hairline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    className="px-4 py-2.5 rounded-plate border border-edge text-label text-ink-muted hover:bg-board-ground transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-5 py-2.5 rounded-plate text-white text-label transition flex items-center gap-2 ${
                      isEditing
                        ? "bg-status-waiting-ink hover:bg-status-waiting-ink"
                        : "bg-board-field hover:bg-board-field-deep"
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

      {/* Replaces window.confirm. The consequence line is the point: the old
          box asked "Are you sure you want to delete" and never said that the
          pin is what the dispatcher's store picker reads. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Delete this store pin?"
        body={`"${pendingDelete?.name ?? ""}" will be removed from the verified places directory.`}
        consequence="Dispatchers will no longer be able to pin an errand to this store. To take it out of circulation without deleting it, set it to Retired instead."
        confirmLabel="Delete the store"
        onConfirm={() => void confirmDeletePlace()}
        busy={isDeleting}
      />

      {/* The failed-delete path had no in-page state at all; it reported
          through alert(). This persists until dismissed or retried. */}
      {deleteError && (
        <p
          role="alert"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-plate bg-status-act-fill px-4 py-2.5 text-label text-status-act-ink"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label="Dismiss"
            className="shrink-0 transition-opacity hover:opacity-70"
          >
            <X size={14} />
          </button>
        </p>
      )}
    </div>
  );
}
