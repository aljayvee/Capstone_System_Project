import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDispatcherPortal } from "./hooks/useDispatcherPortal";
import { ErrandQueueTable } from "./components/ErrandQueueTable";
import { RiderFleetRoster } from "./components/RiderFleetRoster";
import { OrderChatScreen } from "./components/order-chat/OrderChatScreen";
import { RecentChatsPanel } from "./components/RecentChatsPanel";
import { DispatcherRiderMessagesPanel } from "./components/DispatcherRiderMessagesPanel";
import { ActiveErrandsPanel } from "./components/ActiveErrandsPanel";
import { ExceptionQueuePanel } from "./components/ExceptionQueuePanel";
import { DispatcherProfilePanel } from "./components/DispatcherProfilePanel";
import { useOpenExceptions } from "./hooks/useOpenExceptions";
import {
  ClipboardList, Bike, LogOut, Clock, Zap, Bike as BikeIcon, MessageSquare, MessageCircle, X, Activity, AlertTriangle
} from "lucide-react";
import { NotificationBell } from "../../components/NotificationBell";
import { HeaderClock } from "../../components/HeaderClock";
import { useRiderFleetPresence } from "../../hooks/useRiderFleetPresence";
import { fetchStaffPhoto } from "../../services/staffPhotoService";
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
  const {
    activeTab,
    setActiveTab,
    errands,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleVerifyErrand,
    handleReleaseErrand,
    handleDeclineOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  } = useDispatcherPortal(user?.id, user?.name);
  const { riders } = useRiderFleetPresence();
  const exceptionQueue = useOpenExceptions();

  const [sidebarPhotoUri, setSidebarPhotoUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setSidebarPhotoUri(null);
      return;
    }
    fetchStaffPhoto(user.id).then((uri) => {
      if (!cancelled) setSidebarPhotoUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const availableCount = errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE").length;
  const activeCount = errands.filter((e) => {
    const s = String(e.status).toUpperCase();
    return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "COMPLETED" && s !== "DELIVERED" && s !== "PASSING BY";
  }).length;
  const exceptionCount = exceptionQueue.openCount;
  const onlineRidersCount = riders.filter((r) => r.online).length;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex relative overflow-x-hidden w-full">
          {/* Sidebar Navigation - Sugo Midnight Navy */}
          <Sidebar
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
                  <h2 className="font-black text-white text-sm tracking-wider leading-tight truncate">
                    SUGO ON THE GO
                  </h2>
                  <p className="text-[10px] text-slate-300/90 font-semibold tracking-wider truncate mt-0.5">
                    Dispatcher Console • Tacurong
                  </p>
                </div>

                {/* Collapsed Brand Icon Logo (Shown ONLY when collapsed) */}
                <div className="size-9 rounded-lg bg-red-600 hidden group-data-[collapsible=icon]:flex items-center justify-center shrink-0 shadow-xs mx-auto">
                  <BikeIcon size={20} className="text-white" />
                </div>

                {/* Sidebar Trigger Button */}
                <SidebarTrigger className="text-slate-400 hover:text-white hover:bg-white/10 size-8 rounded-lg shrink-0 group-data-[collapsible=icon]:hidden focus-visible:ring-2 focus-visible:ring-white/70" />
              </div>
              <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex text-slate-400 hover:text-white hover:bg-white/10 size-9 rounded-lg mx-auto mt-2 focus-visible:ring-2 focus-visible:ring-white/70" />
            </SidebarHeader>

            {/* Structured Navigation Groups */}
            <SidebarContent className="px-3 py-3 group-data-[collapsible=icon]:px-2.5 space-y-4 transition-all duration-300">
              {/* Operations Group */}
              <SidebarGroup className="p-0 space-y-1">
                <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 px-3 group-data-[collapsible=icon]:hidden">
                  Operations
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {/* Order Queue */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("queue")}
                        isActive={activeTab === "queue"}
                        tooltip={availableCount > 0 ? `Order Queue (${availableCount} available)` : "Order Queue"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "queue"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <ClipboardList
                              size={17}
                              className={`shrink-0 transition-colors ${
                                activeTab === "queue" ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            {availableCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-[#0F2035]" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Order Queue
                          </span>
                        </div>
                        {availableCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "queue"
                                ? "bg-white/20 text-white"
                                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                            }`}
                          >
                            {availableCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Active Errands */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("active_errands")}
                        isActive={activeTab === "active_errands"}
                        tooltip={activeCount > 0 ? `Active Errands (${activeCount} in progress)` : "Active Errands"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "active_errands"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <Activity
                              size={17}
                              className={`shrink-0 transition-colors ${
                                activeTab === "active_errands" ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            {activeCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0F2035]" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Active Errands
                          </span>
                        </div>
                        {activeCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "active_errands"
                                ? "bg-white/20 text-white"
                                : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                            }`}
                          >
                            {activeCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Needs a Decision (Exceptions) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("exceptions")}
                        isActive={activeTab === "exceptions"}
                        tooltip={exceptionCount > 0 ? `Needs a Decision (${exceptionCount} urgent)` : "Needs a Decision"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "exceptions"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <AlertTriangle
                              size={17}
                              className={`shrink-0 transition-colors ${
                                activeTab === "exceptions" ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            {exceptionCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-[#0F2035] animate-pulse" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Needs a Decision
                          </span>
                        </div>
                        {exceptionCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              activeTab === "exceptions"
                                ? "bg-white/20 text-white"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {exceptionCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Fleet Tracking */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("riders")}
                        isActive={activeTab === "riders"}
                        tooltip={riders.length > 0 ? `Tracking (${onlineRidersCount}/${riders.length} online)` : "Tracking"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "riders"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <Bike
                              size={17}
                              className={`shrink-0 transition-colors ${
                                activeTab === "riders" ? "text-white" : "text-slate-400 group-hover:text-white"
                              }`}
                            />
                            {onlineRidersCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0F2035]" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Fleet Tracking
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
                            {onlineRidersCount}/{riders.length}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Communications Group */}
              <SidebarGroup className="p-0 space-y-1">
                <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 px-3 group-data-[collapsible=icon]:hidden">
                  Communications
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {/* Rider Messages */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("messages")}
                        isActive={activeTab === "messages"}
                        tooltip="Rider Messages"
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "messages"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <MessageSquare
                            size={17}
                            className={`shrink-0 transition-colors ${
                              activeTab === "messages" ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
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
                        tooltip="Customer Chats History"
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-bold transition-all duration-200 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "recent_chats"
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <MessageCircle
                            size={17}
                            className={`shrink-0 transition-colors ${
                              activeTab === "recent_chats" ? "text-white" : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Customer Chats
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {/* Sidebar User & Logout Footer */}
            <SidebarFooter className="p-3 border-t border-white/10 group-data-[collapsible=icon]:p-2.5 transition-all duration-300 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                title="Profile & Settings"
                className={`w-full flex items-center gap-2.5 px-3 py-1 rounded-xl transition-colors group-data-[collapsible=icon]:hidden ${
                  activeTab === "profile" ? "bg-white/10" : "hover:bg-white/10"
                } focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none`}
              >
                <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs ring-1 ring-white/10 overflow-hidden">
                  {sidebarPhotoUri ? (
                    <img src={sidebarPhotoUri} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.name || "Duty Dispatcher")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0 text-left opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || "Duty Dispatcher"}
                  </p>
                  <p className="text-[10px] text-slate-300/80 truncate font-mono">
                    {user?.email || "dispatcher@sugo.ph"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="w-full flex items-center justify-start gap-2.5 group-data-[collapsible=icon]:gap-0 h-10 px-3 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-xs group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:mx-auto focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
                title="Sign Out"
              >
                <LogOut size={16} className="shrink-0" />
                <span className="inline-block truncate opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  Sign Out
                </span>
              </button>

              <div className="pt-1 px-3 text-left group-data-[collapsible=icon]:hidden">
                <p className="text-[10px] text-slate-400 font-medium">
                  &copy; {new Date().getFullYear()} Sugo on the Go
                </p>
              </div>
            </SidebarFooter>
            <SidebarRail />
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
                Thank you for your work today, {(user?.name || "Duty Dispatcher").split(" ")[0]}. Are you sure you want to sign out of the Dispatcher console? You'll need to log back in to continue dispatching errands.
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
                  <div className="flex items-center gap-2.5">
                    <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-1 mr-1 size-9 rounded-xl focus-visible:ring-2 focus-visible:ring-slate-400" />
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                      <ClipboardList size={20} />
                    </span>
                    <h1 className="text-xl font-extrabold text-slate-800">Dispatch Management</h1>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <HeaderClock />
                  <NotificationBell />
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. MODULAR CONTENT VIEWS                                      */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div>
                {activeTab === "queue" && (
                  <div className="flex flex-col space-y-4">
                    <div className="w-full">
                      <ErrandQueueTable
                        errands={errands}
                        currentUser={user}
                        onClaimOrder={handleClaimOrder}
                        onDeclineOrder={handleDeclineOrder}
                        onOpenChat={handleOpenChat}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    </div>
                  </div>
                )}
                {activeTab === "active_errands" && (
                  <ActiveErrandsPanel errands={errands} onOpenChat={handleOpenChat} />
                )}
                {activeTab === "exceptions" && <ExceptionQueuePanel queue={exceptionQueue} />}
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
                {activeTab === "profile" && <DispatcherProfilePanel />}
              </div>
            </main>
          
          {/* Full-screen order chat: the conversation and the five dispatch stages */}
          {selectedErrandId && (
            <OrderChatScreen
              orderId={selectedErrandId}
              dispatcher={user}
              onClose={handleCloseChat}
              onRefreshOrders={fetchOrders}
              readOnly={activeTab === "recent_chats"}
              onVerify={(id) => handleVerifyErrand(id, user)}
              onRelease={handleReleaseErrand}
              onDecline={async (id, reason) => {
                await handleDeclineOrder(id, reason);
                handleCloseChat();
              }}
            />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
      </TooltipProvider>
  );
}
