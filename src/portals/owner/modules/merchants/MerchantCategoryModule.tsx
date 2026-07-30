import React, { useState, useEffect } from "react";
import { Store, Plus } from "lucide-react";
import { apiService, ApiMerchantCategory } from "../../../../services/apiService";

export interface MerchantCategory {
  id: number;
  name: string;
  description: string;
  merchantCount: number;
  status: "Active" | "Inactive";
}

export const MerchantCategoryModule: React.FC = () => {
  const [categories, setCategories] = useState<MerchantCategory[]>([
    { id: 1, name: "Groceries & Supermarkets", description: "Food markets, fresh produce, daily essentials", merchantCount: 14, status: "Active" },
    { id: 2, name: "Pharmacies & Drugstores", description: "Medicines, healthcare, wellness supplies", merchantCount: 8, status: "Active" },
    { id: 3, name: "Restaurants & Fast Food", description: "Dine-in, takeout, fast food chains", merchantCount: 26, status: "Active" },
    { id: 4, name: "Hardware & Construction", description: "Tools, building supplies, electricals", merchantCount: 5, status: "Active" },
  ]);

  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const backendCategories = await apiService.getMerchantCategories();
      if (backendCategories && backendCategories.length > 0) {
        setCategories(backendCategories);
      }
    }
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const created = await apiService.createMerchantCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim() || "General merchant category",
    });

    setCategories((prev) => [
      ...prev,
      created
        ? created
        : {
            id: Date.now(),
            name: newCatName.trim(),
            description: newCatDesc.trim() || "General merchant category",
            merchantCount: 0,
            status: "Active",
          },
    ]);

    setNewCatName("");
    setNewCatDesc("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Merchant Category Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Organize partner store categories & errand types</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCategory} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Create New Category</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Bakeries & Pastries"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm outline-none focus:border-[#1E3A5F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Brief category description..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm outline-none focus:border-[#1E3A5F]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1E3A5F] hover:bg-[#162D4A] text-white shadow-sm transition"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{cat.name}</h3>
                  <p className="text-xs text-slate-500">{cat.merchantCount} partner merchants</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {cat.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">{cat.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
