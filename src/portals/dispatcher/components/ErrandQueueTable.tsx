import React from "react";
import { Errand, ErrandStatus } from "../../../types/errand";
import { MessageSquare, CheckCircle, Clock, Bike, CheckCircle2 } from "lucide-react";

interface ErrandQueueTableProps {
  errands: Errand[];
  currentUser: any;
  onClaimOrder: (orderId: string, user: any) => void;
  onOpenChat: (orderId: string) => void;
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => void;
}

export const ErrandQueueTable: React.FC<ErrandQueueTableProps> = ({
  errands,
  currentUser,
  onClaimOrder,
  onOpenChat,
  onUpdateStatus,
}) => {
  if (errands.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">The errand queue is empty right now. New requests will appear here automatically as customers place them.</p>
      </div>
    );
  }

  const currentFirstName = currentUser?.name ? currentUser.name.split(" ")[0] : "Dispatcher";
  const currentUserId = currentUser?.id;

  const availableErrands = errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE");
  const ongoingErrands = errands.filter((e) => {
    const s = String(e.status).toUpperCase();
    return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "PASSING BY" && s !== "COMPLETED";
  });

  const renderTableRows = (list: Errand[], isAvailableSection: boolean) => {
    return list.map((e) => {
      const statusStr = String(e.status);
      const isAvailable = statusStr === "Available" || statusStr === "AVAILABLE";
      const isDoingErrand = statusStr === "DOING ERRAND" || statusStr === "Doing Errand";
      const isPassingBy = statusStr === "PASSING BY" || statusStr === "Passing By";

      const claimedByMe =
        (e.dispatcherId && String(e.dispatcherId) === String(currentUserId)) ||
        (e.dispatcherName && e.dispatcherName.toLowerCase().includes(currentFirstName.toLowerCase())) ||
        (e.dispatchLogs && e.dispatchLogs.some((log: any) => String(log.dispatcherId) === String(currentUserId) || log.dispatcher?.name?.toLowerCase().includes(currentFirstName.toLowerCase())));

      let statusBadgeStyle = "bg-[#FFEEF3] text-[#F62459] border-rose-200";
      if (isAvailable) {
        statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
      } else if (isDoingErrand) {
        statusBadgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
      } else if (isPassingBy) {
        statusBadgeStyle = "bg-slate-100 text-slate-600 border-slate-300";
      }

      return (
        <tr key={e.id} className="hover:bg-slate-50/80 transition">
          <td className="p-4 font-mono font-bold text-[#1E3A5F]">{e.id}</td>
          <td className="p-4 font-bold text-slate-800">{e.customerName}</td>
          <td className="p-4">{e.category}</td>
          <td className="p-4">
            <span className={`px-2.5 py-1 rounded-full text-xs border ${statusBadgeStyle}`}>
              {e.status}
            </span>
          </td>
          <td className="p-4 text-slate-600">
            {e.dispatcherName ? (
              <span className="font-semibold text-slate-700">{e.dispatcherName}</span>
            ) : (
              <span className="italic text-slate-400">Unassigned</span>
            )}
          </td>
          <td className="p-4 text-right flex items-center justify-end gap-2">
            {claimedByMe && !isPassingBy ? (
              <button
                onClick={() => onOpenChat(e.id)}
                className="flex items-center gap-1.5 text-xs bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                <MessageSquare size={14} /> Chat with Customer
              </button>
            ) : isAvailable ? (
              <button
                onClick={() => onClaimOrder(e.id, currentUser)}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                <CheckCircle size={14} /> Accept & Chat
              </button>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2.5 py-1 rounded-md border border-slate-200">
                {isPassingBy ? "Closed (Passing By)" : `Claimed by ${e.dispatcherName || "Another"}`}
              </span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. AVAILABLE ERRAND QUEUE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" /> Available Errand Queue
          </h3>
          <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
            {availableErrands.length} Available
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Errand ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Dispatcher</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {availableErrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-xs italic">
                    No available errand requests right now.
                  </td>
                </tr>
              ) : (
                renderTableRows(availableErrands, true)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. ON-GOING ERRAND QUEUE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Bike size={18} className="text-emerald-600" /> On-Going Errand Queue
          </h3>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
            {ongoingErrands.length} Active / Doing Errand
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="p-4">Errand ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Dispatcher</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ongoingErrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 text-xs italic">
                    No ongoing errands currently in progress.
                  </td>
                </tr>
              ) : (
                renderTableRows(ongoingErrands, false)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

