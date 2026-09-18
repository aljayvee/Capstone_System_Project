import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useDispatcherPortal } from "./hooks/useDispatcherPortal";
// Straight to the workspace. `ErrandQueueTable` was a 21-line file whose entire
// body was `return <DispatchManagementWorkspace {...props} />`, so it added a
// second props interface to keep in sync and a name that promised a table this
// console does not have.
import { DispatchManagementWorkspace } from "./components/workspace/DispatchManagementWorkspace";
import { RiderFleetRoster } from "./components/RiderFleetRoster";
import { OrderChatScreen } from "./components/order-chat/OrderChatScreen";
import { RecentChatsPanel } from "./components/RecentChatsPanel";
import { DispatcherRiderMessagesPanel } from "./components/DispatcherRiderMessagesPanel";
import { ActiveErrandsPanel } from "./components/ActiveErrandsPanel";
import { ExceptionQueuePanel } from "./components/ExceptionQueuePanel";
import { DispatcherProfilePanel } from "./components/DispatcherProfilePanel";
import { useOpenExceptions } from "./hooks/useOpenExceptions";
import {
  ClipboardList, Bike, LogOut, Bike as BikeIcon, MessageSquare, MessageCircle, X, Activity, AlertTriangle
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
import { DispatcherButton } from "@/components/panel/DispatcherButton";
import { formatErrandId } from "../../utils/formatErrandId";
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
    // Destructured at last. isLoading was returned by this hook from the start
    // and never read here, which is why every panel rendered its empty state
    // during the first fetch as though the board were confirmed empty.
    isLoading,
    loadError,
    actionError,
    dismissActionError,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleVerifyErrand,
    handleReleaseErrand,
    handleDeclineOrder,
    handleOpenChat,
    handleCloseChat,
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
  /**
   * The run the board is currently signed to.
   *
   * Reported up by the queue workspace, which stays the owner of its own
   * selection. Holding it here is what lets the destination band repaint to
   * the selected run, which the direction contract names as this surface's
   * signature interaction and which was previously only claimed in a comment.
   */
  const [signedRun, setSignedRun] = useState<any | null>(null);

  const exceptionCount = exceptionQueue.openCount;
  const onlineRidersCount = riders.filter((r) => r.online).length;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        {/* data-portal marks the whole dispatcher shell, rail included. It
            carries nothing but the icon stroke: the navigation rail sits an
            inch from the console and a 2px nav icon beside a 1.5px console icon
            reads as two unfinished halves of one screen. No geometry rides on
            this attribute, so the sidebar alignment contract recorded in
            AGENT_HANDSHAKE.md is untouched. */}
        {/* h-screen, not min-h-screen. A minimum is a floor, so content
            pushed this wrapper past the viewport and the PAGE scrolled: the
            board band, the panel title and the filter row all scrolled away
            with it, which is exactly the pinned-header contract (AGENTS.md
            8.12) that PanelShell exists to keep. Nothing below here had a
            definite height either, so the `h-screen overflow-hidden` on the
            inner main was inert. With a ceiling at this level the flex chain
            resolves and the one region that should scroll is the only one
            that does. The rail scrolls internally through SidebarContent, so
            capping it is safe. */}
        {/* data-surface was missing here, and that was a real defect rather
            than an omission. src/styles/surfaces.css (formerly dispatch.css)
            keys seven rule groups on it: the focus ring, themed scrollbars,
            ::selection, the caret, tabular figures, the motion curve and the
            icon stroke. Only the last also matches [data-portal], so the
            other six had never applied to the console body at all. They fired
            inside the portalled overlays, which carry data-surface themselves
            because they render at document.body, and nowhere else. The one
            focus ring meant to replace per-component focus styles across
            dozens of files was only ever firing in modals. */}
        <div
          data-surface="dispatch"
          data-portal="dispatch"
          className="relative flex h-screen w-full overflow-hidden bg-board-ground text-ink"
        >
          {/* Sidebar Navigation - Sugo Midnight Navy */}
          {/* data-on-field is required now that the root carries data-surface.
              The focus ring is drawn in var(--color-board-field), which IS
              #0F2035, so on a #0F2035 rail it would be an invisible outline.
              This flips it to the ground. Styling only: no geometry rides on
              it, so the alignment contract is untouched. */}
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
            {/* data-surface because DialogContent portals to document.body,
                outside the console element that carries it. */}
            <DialogContent
              data-surface="dispatch"
              className="rounded-modal border-edge shadow-plate"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-panel text-ink">
                  <LogOut size={18} className="text-ink-muted" /> Sign out
                </DialogTitle>
                <DialogClose
                  aria-label="Close this dialog"
                  className="grid size-9 cursor-pointer place-items-center rounded-trim text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
                >
                  <X size={18} />
                </DialogClose>
              </DialogHeader>
              <DialogDescription className="text-body text-ink-muted">
                Thanks for your work today,{" "}
                {(user?.name || "Duty Dispatcher").split(" ")[0]}. Signing out ends your shift on
                this console, and anything you have claimed stays claimed until someone releases
                it.
              </DialogDescription>
              <DialogFooter className="flex-row gap-3">
                <DispatcherButton
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1 justify-center"
                  onClick={() => setShowSignOutConfirm(false)}
                >
                  Stay on shift
                </DispatcherButton>
                <DispatcherButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1 justify-center"
                  icon={<LogOut size={16} />}
                  onClick={() => {
                    setShowSignOutConfirm(false);
                    logout();
                  }}
                >
                  Sign out
                </DispatcherButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Main Operations Console */}
          <SidebarInset className="bg-transparent shadow-none rounded-none m-0 peer-data-[variant=inset]:m-0 peer-data-[variant=inset]:rounded-none peer-data-[variant=inset]:shadow-none w-full relative">
            {/* The console's own surface. Every token and browser-surface rule
                in src/styles/surfaces.css is scoped to this attribute, which is
                what keeps the route board out of the Owner portal. */}
            <main
              data-surface="dispatch"
              className="flex h-screen w-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4"
            >
              {/* ───────────────────────────────────────────────────────────── */}
              {/* 1. THE DESTINATION BAND (pinned)                              */}
              {/*                                                               */}
              {/* The shift itself, read across the room: who is on duty, the    */}
              {/* time, and what is owed a decision right now. It replaces a     */}
              {/* white card carrying a tinted icon chip and a 20px title, which */}
              {/* scrolled away with the page and was the most interchangeable   */}
              {/* element on the surface.                                        */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div
                data-on-field
                className="shrink-0 rounded-plate bg-board-field-deep px-3 py-2.5 shadow-field sm:px-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* No SidebarTrigger here. The rail carries its own in
                      both states, as part of the alignment contract recorded
                      in AGENT_HANDSHAKE.md, and this was a third identical
                      panel-left control sitting 35px from one of them. */}
                  <div className="min-w-0">
                    {/* The board re-signs to the selected run. With nothing
                        picked it names itself; with a run picked it carries
                        that run's destination and route number. This is the
                        contract's signature interaction, and the reason the
                        band is a board rather than a page title. */}
                    <h1 className="truncate text-title uppercase text-board-plate">
                      {signedRun
                        ? signedRun.pinpoints?.[0]?.storeName ||
                          signedRun.category ||
                          "Dispatch board"
                        : "Dispatch board"}
                    </h1>
                    {signedRun ? (
                      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-label text-board-trim">
                        <span data-figure className="font-mono text-data text-board-plate">
                          {formatErrandId(signedRun.id)}
                        </span>
                        <span className="truncate">{signedRun.customerName || "Customer"}</span>
                        <span className="truncate">
                          {signedRun.deliveryAddress || "Tacurong City"}
                        </span>
                      </p>
                    ) : (
                      <p className="truncate text-label text-board-trim">
                        {user?.name || "Duty dispatcher"} on duty, Tacurong City
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* What is owed a decision, at board scale. Red only when
                        something is actually owed: on this surface red means
                        "you must act" and nothing else. */}
                    <div className="text-right">
                      <p className="text-micro uppercase text-board-trim">Needs a decision</p>
                      <p
                        data-figure
                        className={cn(
                          "text-board tabular-nums",
                          exceptionQueue.openCount > 0 ? "text-signal-on-field" : "text-board-plate"
                        )}
                      >
                        {exceptionQueue.isLoading || exceptionQueue.loadError
                          ? "--"
                          : exceptionQueue.openCount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <HeaderClock />
                      <NotificationBell />
                    </div>
                  </div>
                </div>

                {/* Everywhere EXCEPT the exceptions tab.
                    This rendered on all seven tabs, so a profile form
                    announced a queue failure, and on the exceptions tab the
                    identical sentence appeared twice 400px apart. The count
                    above shows "--" wherever the dispatcher is, and this line
                    is what explains that dash — but on the exceptions tab the
                    panel itself says it in full, so the band stays quiet and
                    lets the failing region do the talking. */}
                {exceptionQueue.loadError && activeTab !== "exceptions" ? (
                  <p role="status" className="mt-2 text-label text-board-trim">
                    {exceptionQueue.loadError}
                  </p>
                ) : null}
              </div>

              {/* A failed claim, status change or decline. This is where the
                  two alert() dialogs used to interrupt the shift. */}
              {actionError ? (
                <div
                  role="alert"
                  className="flex shrink-0 items-start justify-between gap-3 rounded-plate bg-status-act-fill px-3 py-2.5 text-label text-status-act-ink"
                >
                  <span>{actionError}</span>
                  <button
                    type="button"
                    onClick={dismissActionError}
                    className="shrink-0 cursor-pointer text-micro uppercase underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* 2. THE ACTIVE SURFACE                                         */}
              {/*                                                               */}
              {/* One flex child that owns the remaining height, so panels size  */}
              {/* from the chain instead of each guessing at 100vh minus a       */}
              {/* constant. min-h-0 is what allows it to shrink.                 */}
              {/* ───────────────────────────────────────────────────────────── */}
              {/* Every tab now owns its own single scroller, through the
                  queue workspace or through PanelShell, so this wrapper only
                  hands out the remaining height. The profile tab was the last
                  one needing an overflow of its own here; nesting that inside
                  a PanelShell scroller would have made two. */}
              <div className="min-h-0 min-w-0 flex-1">
                {activeTab === "queue" && (
                  <DispatchManagementWorkspace
                    errands={errands}
                    currentUser={user}
                    onClaimOrder={handleClaimOrder}
                    onDeclineOrder={handleDeclineOrder}
                    onOpenChat={handleOpenChat}
                    isLoading={isLoading}
                    loadError={loadError}
                    onRetry={fetchOrders}
                    onSignedRunChange={setSignedRun}
                  />
                )}
                {activeTab === "active_errands" && (
                  <ActiveErrandsPanel
                    errands={errands}
                    onOpenChat={handleOpenChat}
                    isLoading={isLoading}
                    loadError={loadError}
                    onRetry={fetchOrders}
                  />
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
                  <RecentChatsPanel
                    errands={errands}
                    onOpenChat={handleOpenChat}
                    isLoading={isLoading}
                    loadError={loadError}
                    onRetry={fetchOrders}
                  />
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
