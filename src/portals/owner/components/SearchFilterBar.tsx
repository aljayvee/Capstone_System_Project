import React from "react";
import { Search } from "lucide-react";

interface SearchFilterBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

// Shared by every owner-portal module with a searchable list (User Management,
// Merchant Category) — extracted so the filter input isn't a second copy-pasted
// implementation each time a module needs one.
export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ value, onChange, placeholder, className }) => (
  <div className={`relative ${className ?? "w-80"}`}>
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm outline-none focus:border-[#1E3A5F]"
    />
  </div>
);
