import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { DashboardModule } from "./modules/dashboard/DashboardModule";
import { UserManagementModule } from "./modules/users/UserManagementModule";
import { RiderManagementModule } from "./modules/riders/RiderManagementModule";
import { MerchantCategoryModule } from "./modules/merchants/MerchantCategoryModule";
import { ServiceRatesModule } from "./modules/rates/ServiceRatesModule";
import { FinancialReportsModule } from "./modules/reports/FinancialReportsModule";
import { RiderTrackingModule } from "./modules/tracking/RiderTrackingModule";
import {
  LayoutDashboard, Users, Bike, Store, DollarSign, BarChart2, MapPin, LogOut, ShieldCheck, Bike as BikeIcon
} from "lucide-react";

export default function OwnerPortal() {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<
    "dashboard" | "users" | "riders" | "merchants" | "rates" | "reports" | "tracking"
  >("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "User Management", icon: Users },
    { id: "riders", label: "Rider Management", icon: Bike },
    { id: "merchants", label: "Merchant Category", icon: Store },
    { id: "rates", label: "Service Rates", icon: DollarSign },
    { id: "reports", label: "Financial Reports", icon: BarChart2 },
    { id: "tracking", label: "Rider Tracking", icon: MapPin },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex">
      {/* Sidebar Navigation - Navy Blue Theme matching Figma prototype */}
      <aside className="w-64 bg-[#1E3A5F] text-white p-6 flex flex-col justify-between shadow-xl">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600 flex items-center justify-center font-extrabold text-lg shadow-lg">
              <BikeIcon size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base leading-tight">OWNER PORTAL</h2>
              <p className="text-[11px] text-blue-200 font-medium tracking-wider">SYSTEM ADMINISTRATION</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-white/15 text-white shadow-sm border border-white/20"
                      : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} /> {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-blue-400/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white">{user?.name || "Aljayvee Versola"}</p>
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

      {/* Main Workspace Console */}
      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        <header className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              {navItems.find((n) => n.id === activeModule)?.label}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Errand Service System Administration
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-sm">
            <ShieldCheck size={16} /> MariaDB Connected
          </span>
        </header>

        {/* Dynamic Light Mode Modules */}
        {activeModule === "dashboard" && <DashboardModule />}
        {activeModule === "users" && <UserManagementModule />}
        {activeModule === "riders" && <RiderManagementModule />}
        {activeModule === "merchants" && <MerchantCategoryModule />}
        {activeModule === "rates" && <ServiceRatesModule />}
        {activeModule === "reports" && <FinancialReportsModule />}
        {activeModule === "tracking" && <RiderTrackingModule />}
      </main>
    </div>
  );
}
