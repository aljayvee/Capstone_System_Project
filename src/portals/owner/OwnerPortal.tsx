import React, { useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { DashboardModule } from "./modules/dashboard/DashboardModule";
import { UserManagementModule } from "./modules/users/UserManagementModule";
import { RiderManagementModule } from "./modules/riders/RiderManagementModule";
import { MerchantCategoryModule } from "./modules/merchants/MerchantCategoryModule";
import { ServiceRatesModule } from "./modules/rates/ServiceRatesModule";
import { FinancialReportsModule } from "./modules/reports/FinancialReportsModule";
import { RiderTrackingModule } from "./modules/tracking/RiderTrackingModule";
import {
  LayoutDashboard, Users, Bike, Store, DollarSign, BarChart2, MapPin, LogOut, Bike as BikeIcon, X
} from "lucide-react";
import { ServerStatusBadge } from "../../components/ServerStatusBadge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ModuleId = "dashboard" | "users" | "riders" | "merchants" | "rates" | "reports" | "tracking";

const MODULE_IDS: ModuleId[] = ["dashboard", "users", "riders", "merchants", "rates", "reports", "tracking"];

export default function OwnerPortal() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const requestedModule = searchParams.get("module");
  const activeModule: ModuleId = MODULE_IDS.includes(requestedModule as ModuleId)
    ? (requestedModule as ModuleId)
    : "dashboard";

  const setActiveModule = (id: ModuleId) => {
    setSearchParams({ module: id }, { replace: true });
  };

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
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex w-full">
          {/* Sidebar Navigation - Navy Blue Theme matching Figma prototype */}
          <Sidebar collapsible="icon" className="border-none" variant="sidebar" style={{ "--sidebar-background": "#162D4A", "--sidebar-foreground": "white", "--sidebar-primary": "white", "--sidebar-primary-foreground": "#162D4A", "--sidebar-border": "rgba(96, 165, 250, 0.2)", "--sidebar-accent": "rgba(255, 255, 255, 0.1)", "--sidebar-accent-foreground": "white", "--sidebar-ring": "white" } as React.CSSProperties}>
            <SidebarHeader className="p-4 border-b border-white/10 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:py-3.5 transition-all duration-300 ease-in-out">
              <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 w-full transition-all duration-300 ease-in-out">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 transition-all duration-300 ease-in-out">
                  <BikeIcon size={20} className="text-white transition-all duration-300 ease-in-out" />
                </div>
                <div className="min-w-0 transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <h2 className="font-black text-white text-sm tracking-wide leading-tight truncate">OWNER PORTAL</h2>
                  <p className="text-[10px] text-blue-300/80 font-semibold tracking-wider truncate">SYSTEM ADMINISTRATION</p>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2 py-1.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3 transition-all duration-300 ease-in-out">
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => setActiveModule(item.id)}
                            isActive={isActive}
                            tooltip={item.label}
                            size="default"
                            className={`w-full flex items-center gap-2.5 px-3 h-10.5 rounded-none border-l-[3px] text-sm font-bold transition-all duration-300 ease-in-out group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:size-9! ${
                              isActive
                                ? "border-l-blue-400 bg-white/10 text-white"
                                : "border-l-transparent text-white/55 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <Icon size={18} className="shrink-0 transition-all duration-300 ease-in-out" />
                            <span className="inline-block truncate transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-2.5 border-t border-white/10 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3 transition-all duration-300 ease-in-out gap-1.5">
              <div className="flex items-center gap-2.5 mb-0.5 min-w-0 group-data-[collapsible=icon]:hidden transition-all duration-300 ease-in-out">
                <div 
                  className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md transition-all duration-300 ease-in-out"
                  title={user?.name || "Aljayvee Versola"}
                >
                  {(user?.name || "Aljayvee Versola").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="text-[13px] font-bold text-white truncate">{user?.name || "Aljayvee Versola"}</p>
                  <p className="text-[10px] text-blue-200/70 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 h-10.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold transition-all duration-300 ease-in-out group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:gap-0"
                title="Sign Out"
              >
                <LogOut size={14} className="shrink-0 transition-all duration-300 ease-in-out" />
                <span className="inline-block truncate transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">Sign Out</span>
              </button>
            </SidebarFooter>
          </Sidebar>

          <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <LogOut className="text-red-500" size={20} /> Sign Out
                </DialogTitle>
                <DialogClose className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X size={18} />
                </DialogClose>
              </DialogHeader>
              <DialogDescription>
                Thank you for your work today, {(user?.name || "Aljayvee Versola").split(" ")[0]}. Are you sure you want to sign out of the Owner Portal? You'll need to log back in to continue managing the system.
              </DialogDescription>
              <DialogFooter className="flex-row gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSignOutConfirm(false);
                    logout();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Main Workspace Console */}
          <SidebarInset className="bg-transparent shadow-none rounded-none m-0 peer-data-[variant=inset]:m-0 peer-data-[variant=inset]:rounded-none peer-data-[variant=inset]:shadow-none w-full">
            <main className="flex-1 p-8 overflow-y-auto space-y-8 h-screen w-full">
              <header className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">
                      {navItems.find((n) => n.id === activeModule)?.label}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Errand Service System Administration
                    </p>
                  </div>
                </div>
                <ServerStatusBadge />
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
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
