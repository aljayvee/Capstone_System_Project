import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useServerStatus } from "../hooks/useServerStatus";

export function ServerStatusBadge() {
  const isOnline = useServerStatus();

  return (
    <span
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold shadow-sm ${
        isOnline
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-red-50 text-red-700 border-red-200"
      }`}
    >
      {isOnline ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
