import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, sub, icon: Icon, color }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase">{title}</p>
          <p className="mt-1 text-slate-800 text-2xl font-extrabold">{value}</p>
          <p className="mt-1 text-slate-500 text-xs">{sub}</p>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </div>
  );
};
