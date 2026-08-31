import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, sub, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/90 space-y-1 transition hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 text-[10.5px] font-extrabold uppercase tracking-wider truncate">{title}</p>
          <p className="mt-0.5 text-slate-900 text-xl sm:text-2xl font-black truncate">{value}</p>
          {sub ? <p className="mt-0.5 text-slate-500 text-[11px] font-medium truncate">{sub}</p> : null}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-2 shadow-2xs" style={{ background: `${color}15` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
};
