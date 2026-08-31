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
  LayoutDashboard,
  Users,
  Bike,
  Store,
  DollarSign,
  BarChart2,
  MapPin,
  LogOut,
  Bike as BikeIcon,
  X,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
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

interface NavSection {
  title: string;
  items: {
    id: ModuleId;
    label: string;
    icon: any;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "reports", label: "Reports", icon: BarChart2 },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "riders", label: "Riders", icon: Bike },
      { id: "tracking", label: "Live Map", icon: MapPin },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "merchants", label: "Merchants & Places", icon: Store },
      { id: "rates", label: "Service Rates", icon: DollarSign },
    ],
  },
];

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

  const currentLabel =
    NAV_SECTIONS.flatMap((s) => s.items).find((n) => n.id === activeModule)?.label || "Dashboard";

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="h-screen w-full bg-[#F8FAFC] text-slate-900 flex overflow-hidden">
          {/* Sidebar Navigation - Navy Theme */}
          <Sidebar
            collapsible="icon"
            className="border-r border-slate-800/20 shadow-xl select-none"
            variant="sidebar"
            style={
              {
                "--sidebar-background": "#0F2035",
                "--sidebar-foreground": "white",
                "--sidebar-primary": "white",
                "--sidebar-primary-foreground": "#0F2035",
                "--sidebar-border": "rgba(255, 255, 255, 0.08)",
                "--sidebar-accent": "rgba(255, 255, 255, 0.08)",
                "--sidebar-accent-foreground": "white",
                "--sidebar-ring": "white",
              } as React.CSSProperties
            }
          >
            {/* Header Brand */}
            <SidebarHeader className="p-4 border-b border-white/10 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-3.5 transition-all duration-300">
              <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 w-full">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0 shadow-md">
                  <BikeIcon size={20} className="text-white" />
                </div>
                <div className="min-w-0 transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <h2 className="font-black text-white text-sm tracking-wider leading-tight truncate">
                    OWNER
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider truncate mt-0.5">
                    ADMIN PANEL
                  </p>
                </div>
              </div>
            </SidebarHeader>

            {/* Structured Navigation Groups */}
            <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-1.5 space-y-4 transition-all duration-300">
              {NAV_SECTIONS.map((section, sIdx) => (
                <SidebarGroup key={section.title} className="p-0 space-y-1">
                  <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400/70 px-2 group-data-[collapsible=icon]:hidden">
                    {section.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeModule === item.id;

                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => setActiveModule(item.id)}
                              isActive={isActive}
                              tooltip={item.label}
                              size="default"
                              className={`w-full flex items-center justify-start px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/40"
                                  : "text-slate-300 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  size={17}
                                  className={`shrink-0 transition-colors ${
                                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                                  }`}
                                />
                                <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                                  {item.label}
                                </span>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>

            {/* Sidebar User Profile & Sign Out Footer */}
            <SidebarFooter className="p-3 border-t border-white/10 group-data-[collapsible=icon]:p-1.5 transition-all duration-300 gap-2">
              <div className="flex items-center gap-2.5 p-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <div
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md ring-2 ring-white/10"
                  title={user?.name || "Aljayvee Versola"}
                >
                  {(user?.name || "Aljayvee Versola")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="text-xs font-bold text-white truncate">{user?.name || "Aljayvee Versola"}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition shadow-xs group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:mx-auto"
                title="Sign Out"
              >
                <LogOut size={15} className="shrink-0" />
                <span className="inline-block truncate opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  Sign Out
                </span>
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
          <SidebarInset className="bg-transparent shadow-none rounded-none m-0 peer-data-[variant=inset]:m-0 peer-data-[variant=inset]:rounded-none peer-data-[variant=inset]:shadow-none w-full h-full min-h-0 flex flex-col overflow-hidden">
            <main className="flex-1 p-3 sm:p-4 md:p-5 flex flex-col h-full w-full min-h-0 overflow-hidden">
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
