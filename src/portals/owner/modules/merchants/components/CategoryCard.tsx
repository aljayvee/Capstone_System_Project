import React, { useState } from "react";
import {
  Store,
  Pencil,
  Check,
  Building2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  Layers,
  Sparkles,
  Info,
  X,
  MapPin,
} from "lucide-react";
import { apiService, type ApiMerchantCategory } from "../../../../../services/apiService";

interface CategoryRowCardProps {
  category: ApiMerchantCategory;
  onUpdated: (updated: ApiMerchantCategory) => void;
  index: number;
}

// Visual category color palette mapping based on theme
const CATEGORY_COLOR_SCHEMES = [
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", iconBg: "bg-blue-600" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", iconBg: "bg-emerald-600" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", iconBg: "bg-amber-600" },
  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", iconBg: "bg-purple-600" },
  { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", iconBg: "bg-rose-600" },
  { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", iconBg: "bg-cyan-600" },
];

export const CategoryRowCard: React.FC<CategoryRowCardProps> = ({
  category,
  onUpdated,
  index,
}) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(category.status);
  const [isSaving, setIsSaving] = useState(false);

  const scheme = CATEGORY_COLOR_SCHEMES[index % CATEGORY_COLOR_SCHEMES.length];
  const placesCount = category._count?.places ?? 0;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const updated = await apiService.updateMerchantCategory(category.id, {
        name: name.trim(),
        description: description.trim(),
        status,
      });
      if (updated) {
        onUpdated({ ...updated, _count: category._count });
        setEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(category.name);
    setDescription(category.description || "");
    setStatus(category.status);
    setEditing(false);
  };

  const toggleQuickStatus = async () => {
    const nextStatus = category.status === "Active" ? "Inactive" : "Active";
    const updated = await apiService.updateMerchantCategory(category.id, {
      status: nextStatus,
    });
    if (updated) {
      onUpdated({ ...updated, _count: category._count });
    }
  };

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
        editing
          ? "border-amber-400 ring-2 ring-amber-100 bg-amber-50/20"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: Icon & Title & Description */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Visual Category Badge */}
          <div
            className={`w-11 h-11 rounded-xl ${scheme.bg} ${scheme.text} border ${scheme.border} flex items-center justify-center font-bold shrink-0 shadow-xs mt-0.5`}
          >
            <Store size={22} />
          </div>

          {/* Name & Description / Form */}
          <div className="flex-1 min-w-0 space-y-1">
            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full font-bold text-slate-800 text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    placeholder="Brief description..."
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base truncate">
                    {category.name}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      category.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {category.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {category.description || (
                    <span className="italic text-slate-400">No description provided.</span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Quick Stats & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                title="Cancel Edit"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                title="Save Changes"
              >
                <Check size={14} />
                <span>Save</span>
              </button>
            </div>
          ) : (
            <>
              {/* Linked Establishments Counter Badge */}
              <div
                className="flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold"
                title={`${placesCount} pre-recorded establishments categorized under this category`}
              >
                <Building2 size={14} className="text-slate-400" />
                <span className="font-mono font-bold text-slate-900">{placesCount}</span>
                <span className="text-[11px] text-slate-500">Stores</span>
              </div>

              {/* Quick Toggle Status */}
              <button
                onClick={toggleQuickStatus}
                className={`p-1.5 rounded-xl border transition ${
                  category.status === "Active"
                    ? "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                    : "text-slate-400 hover:bg-slate-100 border-slate-200"
                }`}
                title={`Click to ${category.status === "Active" ? "deactivate" : "activate"} category`}
              >
                {category.status === "Active" ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>

              {/* Edit Button */}
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition"
                title="Edit Category Details"
              >
                <Pencil size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
