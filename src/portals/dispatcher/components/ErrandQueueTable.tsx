import React from "react";
import { Errand, ErrandStatus } from "../../../types/errand";

interface ErrandQueueTableProps {
  errands: Errand[];
  onUpdateStatus: (errandId: string, newStatus: ErrandStatus) => void;
}

export const ErrandQueueTable: React.FC<ErrandQueueTableProps> = ({ errands, onUpdateStatus }) => {
  if (errands.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        <p className="text-sm font-medium">Errand queue is currently empty. New requests from MariaDB database will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800">Active Errand Queue</h3>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="p-4">Errand ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Category</th>
              <th className="p-4">Status</th>
              <th className="p-4">Assigned Rider</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errands.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/80 transition">
                <td className="p-4 font-mono font-bold text-[#1E3A5F]">{e.id}</td>
                <td className="p-4 font-bold text-slate-800">{e.customerName}</td>
                <td className="p-4">{e.category}</td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      e.status === "Pending"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="p-4 text-slate-600">
                  {e.riderName ? e.riderName : <span className="italic text-slate-400">Unassigned</span>}
                </td>
                <td className="p-4 text-right">
                  {e.status === "Pending" ? (
                    <button
                      onClick={() => onUpdateStatus(e.id, "Assigned")}
                      className="text-xs bg-[#1E3A5F] hover:bg-[#162D4A] text-white font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      Assign Rider
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">In Progress</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
