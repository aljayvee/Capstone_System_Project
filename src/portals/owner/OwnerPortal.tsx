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
import { AccountSecurityLogsView } from "@/components/account/AccountSecurityLogsView";
import type { LucideIcon } from "lucide-react";
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
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PanelButton } from "@/components/panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ModuleId = "dashboard" | "users" | "riders" | "merchants" | "rates" | "reports" | "tracking" | "security";

const MODULE_IDS: ModuleId[] = [
  "dashboard",
  "users",
  "riders",
  "merchants",
  "rates",
  "reports",
  "tracking",
  "security",
];

interface NavSection {
  title: string;
  items: {
    id: ModuleId;
    label: string;
    icon: LucideIcon;
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
      { id: "tracking", label: "Tracking", icon: MapPin },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "merchants", label: "Merchants Category", icon: Store },
      { id: "rates", label: "Service Rates", icon: DollarSign },
      { id: "security", label: "Account Logs", icon: ShieldCheck },
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

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        {/* data-surface opts this portal into src/styles/surfaces.css, which
            owns the parts nobody draws: the focus ring, themed scrollbars,
            ::selection, the caret, tabular figures and one motion curve. The
            same attribute selects the eight-token re-skin in
            src/styles/owner.css, and that is what makes the shared primitives
            render in cool slate and #1E3A5F navy rather than the dispatcher's
            warm bone. data-portal carries only the 1.5px icon stroke, rail
            included, so no geometry rides on either attribute and the sidebar
            alignment contract in AGENT_HANDSHAKE.md is untouched.

            h-screen, not min-h-screen, was already right here: a minimum is a
            floor, so content can push the wrapper past the viewport and
            scroll the page, taking every module's pinned header with it. */}
        <div
          data-surface="owner"
          data-portal="owner"
          className="flex h-screen w-full overflow-hidden bg-board-ground text-ink"
        >
          {/* Sidebar Navigation - Navy Theme */}
          {/* data-on-field marks the whole rail as painted navy. It inverts
              the focus ring to the ground and flips ::selection, because a
              navy outline on a navy rail is not a focus ring. The attribute
              lands on the primitive's sidebar-container, an ancestor of every
              row, so one declaration covers the lot. */}
          <Sidebar
            data-on-field
            collapsible="icon"
            className="border-r border-white/10 select-none"
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
            <SidebarHeader className="px-3 py-3.5 border-b border-white/10 group-data-[collapsible=icon]:p-2.5 transition-all duration-300">
              <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:gap-0 overflow-hidden w-full">
                {/* Expanded Text Branding (Hidden when collapsed) */}
                <div className="min-w-0 px-3 group-data-[collapsible=icon]:px-0 transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="truncate text-panel leading-tight text-board-plate">
                    SUGO ON THE GO
                  </p>
                  <p className="mt-0.5 truncate text-label text-board-trim">
                    Owner Console • Tacurong
                  </p>
                </div>

                {/* Collapsed Brand Icon Logo (Shown ONLY when collapsed) */}
                <div className="size-9 rounded-trim bg-signal hidden group-data-[collapsible=icon]:flex items-center justify-center shrink-0 mx-auto">
                  <BikeIcon size={20} className="text-board-plate" />
                </div>

                {/* Sidebar Trigger Button */}
                <SidebarTrigger className="text-board-trim hover:text-board-plate hover:bg-white/10 size-8 rounded-trim shrink-0 group-data-[collapsible=icon]:hidden" />
              </div>
              <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex text-board-trim hover:text-board-plate hover:bg-white/10 size-9 rounded-trim mx-auto mt-2" />
            </SidebarHeader>

            {/* Structured Navigation Groups */}
            <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-2.5 space-y-4 transition-all duration-300">
              {NAV_SECTIONS.map((section) => (
                <SidebarGroup key={section.title} className="p-0 space-y-1">
                  <SidebarGroupLabel className="px-3 text-micro uppercase text-board-trim group-data-[collapsible=icon]:hidden">
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
                              aria-current={isActive ? "page" : undefined}
                              // text-label, not text-micro: micro carries
                              // +0.06em tracking, which is set for uppercase
                              // labels. These nav labels are title case and
                              // stay that way, because the sidebar's wording
                              // is frozen and rendering "Dashboard" as
                              // "DASHBOARD" changes how it reads even though
                              // the string is untouched.
                              //
                              // No shadow on the active row: AGENT_HANDSHAKE
                              // [LOCKED] Flat Design Surface Purity prohibits
                              // it, and bg-signal IS #DC2626, the same red-600
                              // this rendered before.
                              className={`w-full flex items-center justify-start px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                                isActive
                                  ? "bg-signal text-board-plate"
                                  : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                                <Icon
                                  size={16}
                                  className={`shrink-0 transition-colors ${
                                    isActive
                                      ? "text-board-plate"
                                      : "text-board-trim group-hover:text-board-plate"
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
            <SidebarFooter className="p-3 border-t border-white/10 group-data-[collapsible=icon]:p-2.5 transition-all duration-300 gap-2">
              <button
                type="button"
                onClick={() => setActiveModule("security")}
                className="flex items-center gap-2.5 px-3 py-1 min-w-0 group-data-[collapsible=icon]:hidden text-left rounded-plate hover:bg-white/5 transition-colors cursor-pointer w-full"
                title="View Account Logs & Security"
              >
                <div
                  className="w-9 h-9 rounded-plate bg-signal flex items-center justify-center text-board-plate text-micro shrink-0 ring-1 ring-white/10"
                  title={user?.name || "System Administrator"}
                >
                  {(user?.name || "System Administrator")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="truncate text-label text-board-plate">
                    {user?.name || "System Administrator"}
                  </p>
                  <p className="truncate font-mono text-micro text-board-trim">
                    {user?.email || "owner@sugo.ph"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-start gap-2.5 group-data-[collapsible=icon]:gap-0 h-10 px-3 rounded-plate bg-signal hover:bg-signal-deep text-board-plate text-label transition-colors group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:mx-auto"
                title="Sign Out"
              >
                <LogOut size={16} className="shrink-0" />
                <span className="inline-block truncate opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  Sign Out
                </span>
              </button>

              <div className="pt-1 px-3 text-left group-data-[collapsible=icon]:hidden">
                <p className="text-micro text-board-trim">
                  &copy; {new Date().getFullYear()} Sugo on the Go
                </p>
              </div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>

          <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
            {/* data-surface because DialogContent renders through a portal at
                document.body, outside the element that carries it on the
                shell. Without it this dialog gets none of the design system:
                no focus ring, no themed selection, no icon stroke, and the
                token re-skin resolves to the dispatcher's values. */}
            <DialogContent data-surface="owner" className="rounded-modal border-edge">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-panel text-ink">
                  <LogOut className="text-signal" size={20} /> Sign Out
                </DialogTitle>
                <DialogClose
                  aria-label="Close dialog"
                  className="rounded-trim p-1 text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
                >
                  <X size={18} />
                </DialogClose>
              </DialogHeader>
              <DialogDescription className="text-body text-ink-muted">
                Thank you for your work today,{" "}
                {(user?.name || "System Administrator").split(" ")[0]}. Are you sure you want to
                sign out of the Owner Portal? You'll need to log back in to continue managing the
                system.
              </DialogDescription>
              <DialogFooter className="flex-row gap-3">
                <PanelButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowSignOutConfirm(false)}
                >
                  Cancel
                </PanelButton>
                <PanelButton
                  variant="primary"
                  className="flex-1"
                  icon={<LogOut size={16} />}
                  onClick={() => {
                    setShowSignOutConfirm(false);
                    logout();
                  }}
                >
                  Log Out
                </PanelButton>
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
              {activeModule === "security" && (
                <div className="h-full overflow-y-auto pr-1">
                  <AccountSecurityLogsView showHeader={true} />
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
