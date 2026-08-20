import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDispatcherPortal } from "./hooks/useDispatcherPortal";
import { ErrandQueueTable } from "./components/ErrandQueueTable";
import { RiderFleetRoster } from "./components/RiderFleetRoster";
import { DispatcherChatPanel } from "./components/DispatcherChatPanel";
import { RecentChatsPanel } from "./components/RecentChatsPanel";
import { DispatcherRiderMessagesPanel } from "./components/DispatcherRiderMessagesPanel";
import { ActiveErrandsPanel } from "./components/ActiveErrandsPanel";
import {
  ClipboardList, Bike, LogOut, Clock, Zap, Bike as BikeIcon, MessageSquare, MessageCircle, X, Map as MapIcon, Activity
} from "lucide-react";
import { ServerStatusBadge } from "../../components/ServerStatusBadge";
import { NotificationBell } from "../../components/NotificationBell";
import LiveFleetMap from "../../components/LiveFleetMap";
import { useRiderFleetPresence } from "../../hooks/useRiderFleetPresence";
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

export default function DispatcherPortal() {
  const { user, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showFleetMap, setShowFleetMap] = useState(false);
  const {
    activeTab,
    setActiveTab,
    errands,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  } = useDispatcherPortal(user?.id);
  const { riders } = useRiderFleetPresence();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex relative overflow-x-hidden w-full">
          {/* Sidebar Navigation - Navy Blue Theme matching Figma prototype */}
          <Sidebar collapsible="icon" className="border-none" variant="sidebar" style={{ "--sidebar-background": "#162D4A", "--sidebar-foreground": "white", "--sidebar-primary": "white", "--sidebar-primary-foreground": "#162D4A", "--sidebar-border": "rgba(96, 165, 250, 0.2)", "--sidebar-accent": "rgba(255, 255, 255, 0.1)", "--sidebar-accent-foreground": "white", "--sidebar-ring": "white" } as React.CSSProperties}>
            <SidebarHeader className="p-4 border-b border-white/10 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:py-3.5 transition-all duration-300 ease-in-out">
              <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 w-full transition-all duration-300 ease-in-out">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 transition-all duration-300 ease-in-out">
                  <BikeIcon size={20} className="text-white transition-all duration-300 ease-in-out" />
                </div>
                <div className="min-w-0 transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <h2 className="font-black text-white text-sm tracking-wide leading-tight truncate">DISPATCHER</h2>
                  <p className="text-[10px] text-blue-300/80 font-semibold tracking-wider truncate">OPERATIONS CONSOLE</p>
                </div>
              </div>
            </SidebarHeader>

            {/* Structured Navigation Groups */}
            <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-1.5 space-y-4 transition-all duration-300">
              <SidebarGroup className="p-0">
                <div className="px-3 mb-2 group-data-[collapsible=icon]:hidden">
                  <span className="text-[10px] font-extrabold uppercase text-blue-300/60 tracking-wider">
                    DISPATCH CONSOLE
                  </span>
                </div>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1.5">
                    {/* Errand Queue */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("queue")}
                        isActive={activeTab === "queue"}
                        tooltip="Errand Queue"
                        size="default"
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-10 ${
                          activeTab === "queue"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ClipboardList size={18} className="shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            Errand Queue
                          </span>
                        </div>
                        {errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE").length > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "queue"
                                ? "bg-white/20 text-white"
                                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                            }`}
                          >
                            {errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE").length}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Active Errand */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("active_errands")}
                        isActive={activeTab === "active_errands"}
                        tooltip="Active Errand"
                        size="default"
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-10 ${
                          activeTab === "active_errands"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Activity size={18} className="shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            Active Errand
                          </span>
                        </div>
                        {errands.filter((e) => {
                          const s = String(e.status).toUpperCase();
                          return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "COMPLETED" && s !== "DELIVERED" && s !== "PASSING BY";
                        }).length > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "active_errands"
                                ? "bg-white/20 text-white"
                                : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                            }`}
                          >
                            {errands.filter((e) => {
                              const s = String(e.status).toUpperCase();
                              return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "COMPLETED" && s !== "DELIVERED" && s !== "PASSING BY";
                            }).length}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Riders */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("riders")}
                        isActive={activeTab === "riders"}
                        tooltip="Riders"
                        size="default"
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-10 ${
                          activeTab === "riders"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Bike size={18} className="shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            Live Map
                          </span>
                        </div>
                        {riders.length > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "riders"
                                ? "bg-white/20 text-white"
                                : "bg-blue-400/20 text-blue-300 border border-blue-400/30"
                            }`}
                          >
                            {riders.filter((r) => r.online).length}/{riders.length}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Messages */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("messages")}
                        isActive={activeTab === "messages"}
                        tooltip="Messages"
                        size="default"
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-10 ${
                          activeTab === "messages"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MessageCircle size={18} className="shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            Rider Messages
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Customer Chats */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("recent_chats")}
                        isActive={activeTab === "recent_chats"}
                        tooltip="Customer Chats"
                        size="default"
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-10 ${
                          activeTab === "recent_chats"
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MessageSquare size={18} className="shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            Customer Chats History
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {/* Sidebar User & Logout Footer */}
            <SidebarFooter className="p-3 border-t border-white/10 group-data-[collapsible=icon]:p-2 space-y-2">
              <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <div
                  className="w-9 h-9 rounded-xl bg-blue-600/80 border border-blue-400/30 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                  title={user?.name || "Dispatcher"}
                >
                  {(user?.name || "Dispatcher")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || "Dispatcher"}
                  </p>
                  <p className="text-[10px] text-blue-200/60 truncate font-mono">
                    {user?.email || "dispatcher@errand.ph"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl bg-white/10 hover:bg-red-600 text-slate-300 hover:text-white text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:mx-auto"
                title="Sign Out"
              >
                <LogOut size={15} />
                <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
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
                Thank you for your work today, {(user?.name || "Mark Dennis Batcharo").split(" ")[0]}. Are you sure you want to sign out of the Dispatcher console? You'll need to log back in to continue dispatching errands.
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

          {/* Main Operations Console */}
          <SidebarInset className="bg-transparent shadow-none rounded-none m-0 peer-data-[variant=inset]:m-0 peer-data-[variant=inset]:rounded-none peer-data-[variant=inset]:shadow-none w-full relative">
            <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6 h-screen w-full">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* 1. TOP HERO HEADER (Scrolls away with page)                   */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                      <ClipboardList size={20} />
                    </span>
                    <h1 className="text-xl font-extrabold text-slate-800">Dispatch Console</h1>
                  </div>
                  <p className="text-xs text-slate-500 max-w-xl">
                    Coordinate customer errands, assign delivery riders, and monitor active orders in real time.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <NotificationBell />
                  <ServerStatusBadge />
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. OPERATIONAL KPI SUMMARY CARDS (Sticky when hitting top)     */}
              {/* ───────────────────────────────────────────────────────────── */}
              <section className="sticky top-0 z-30 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F9FAFB]/95 backdrop-blur-md py-2.5 -my-2.5 transition-all">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold">
                    <Clock size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Awaiting Dispatch</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE").length} Errands
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
                    <Zap size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Errands</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {
                        errands.filter((e) => {
                          const s = String(e.status).toUpperCase();
                          return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "PASSING BY" && s !== "COMPLETED" && s !== "DELIVERED";
                        }).length
                      }{" "}
                      Errands
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5 hover:shadow-sm transition">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                    <Bike size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Riders Ready</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">
                      {riders.filter((r) => r.online).length} of {riders.length} Riders
                    </p>
                  </div>
                </div>
              </section>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 3. MODULAR CONTENT VIEWS                                      */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div>
                {activeTab === "queue" && (
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowFleetMap(!showFleetMap)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 transition shadow-sm border border-blue-200"
                      >
                        <MapIcon size={18} />
                        {showFleetMap ? 'Hide Fleet Map' : 'Show Fleet Map'}
                      </button>
                    </div>
                    <div className="flex flex-1 gap-6 min-h-0">
                      <div className={`transition-all duration-300 ${showFleetMap ? 'w-2/3 pr-2' : 'w-full'}`}>
                        <ErrandQueueTable
                          errands={errands}
                          currentUser={user}
                          onClaimOrder={handleClaimOrder}
                          onOpenChat={handleOpenChat}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      </div>
                      {showFleetMap && (
                        <div className="w-1/3 h-[500px]">
                          <LiveFleetMap riders={riders} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === "active_errands" && (
                  <ActiveErrandsPanel errands={errands} onOpenChat={handleOpenChat} />
                )}
                {activeTab === "riders" && <RiderFleetRoster riders={riders} />}
                {activeTab === "messages" && (
                  <DispatcherRiderMessagesPanel
                    errands={errands}
                    riders={riders}
                    dispatcher={user}
                  />
                )}
                {activeTab === "recent_chats" && (
                  <RecentChatsPanel errands={errands} onOpenChat={handleOpenChat} />
                )}
              </div>
            </main>
          
          {/* Slide-In Side Drawer for Live Chat & Tools */}
          {selectedErrandId && (
            <DispatcherChatPanel
              orderId={selectedErrandId}
              dispatcher={user}
              onClose={handleCloseChat}
              onRefreshOrders={fetchOrders}
              readOnly={activeTab === "recent_chats"}
            />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
      </TooltipProvider>
  );
}
