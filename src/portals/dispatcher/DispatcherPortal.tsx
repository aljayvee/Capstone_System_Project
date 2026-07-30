import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useDispatcherPortal } from "./hooks/useDispatcherPortal";
import { ErrandQueueTable } from "./components/ErrandQueueTable";
import { RiderFleetRoster } from "./components/RiderFleetRoster";
import {
  ClipboardList, Bike, LogOut, Plus, Clock, Zap, Navigation, ShieldCheck, Bike as BikeIcon
} from "lucide-react";

export default function DispatcherPortal() {
  const { user, logout } = useAuth();
  const { activeTab, setActiveTab, errands, riders, handleUpdateStatus } = useDispatcherPortal();

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex">
      {/* Sidebar Navigation - Navy Blue Theme matching Figma prototype */}
      <aside className="w-64 bg-[#1E3A5F] text-white p-6 flex flex-col justify-between shadow-xl">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center font-extrabold text-lg shadow-lg">
              <BikeIcon size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base leading-tight">DISPATCHER</h2>
              <p className="text-[11px] text-blue-200 font-medium tracking-wider">OPERATIONS CONSOLE</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "queue"
                  ? "bg-white/15 text-white shadow-sm border border-white/20"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ClipboardList size={18} /> Errand Queue
            </button>

            <button
              onClick={() => setActiveTab("riders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "riders"
                  ? "bg-white/15 text-white shadow-sm border border-white/20"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Bike size={18} /> Rider Monitoring
            </button>

            <button
              onClick={() => setActiveTab("live_map")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "live_map"
                  ? "bg-white/15 text-white shadow-sm border border-white/20"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Navigation size={18} /> Live Map Monitor
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-blue-400/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">{user?.name || "Mark Dennis Batcharo"}</p>
            <p className="text-[11px] text-blue-200/70">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Operations Console */}
      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Live Dispatching Operations</h1>
            <p className="text-sm text-slate-500 mt-0.5">Dedicated Dispatcher Operations Console</p>
          </div>
          <button className="flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162D4A] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition">
            <Plus size={16} /> Create Manual Errand
          </button>
        </header>

        {/* Operational Status Cards */}
        <section className="grid grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Pending Queue</p>
              <p className="text-2xl font-extrabold text-slate-800">{errands.filter((e) => e.status === "Pending").length} Errands</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">En Route / Active</p>
              <p className="text-2xl font-extrabold text-slate-800">{errands.filter((e) => e.status !== "Pending").length} Errands</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Bike size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Available Riders</p>
              <p className="text-2xl font-extrabold text-slate-800">{riders.filter((r) => r.status === "Available").length} Riders</p>
            </div>
          </div>
        </section>

        {/* Modular Views */}
        {activeTab === "queue" && <ErrandQueueTable errands={errands} onUpdateStatus={handleUpdateStatus} />}
        {activeTab === "riders" && <RiderFleetRoster riders={riders} />}
        {activeTab === "live_map" && <RiderFleetRoster riders={riders} />}
      </main>
    </div>
  );
}
