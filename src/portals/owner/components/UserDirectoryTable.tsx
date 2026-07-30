import React from "react";

interface UserDirectoryTableProps {
  users: any[];
}

export const UserDirectoryTable: React.FC<UserDirectoryTableProps> = ({ users }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">System User Directory</h3>
      <div className="divide-y divide-slate-800">
        {users.map((acc) => (
          <div key={acc.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300">
                {acc.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                <p className="text-xs text-slate-500">{acc.email}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
              {acc.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
