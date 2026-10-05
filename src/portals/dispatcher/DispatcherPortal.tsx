import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useMaintenanceCheck } from "../../hooks/useMaintenanceCheck";
import { MaintenanceOverlay } from "../../components/MaintenanceOverlay";
import { MaintenanceWarningBanner } from "../../components/MaintenanceWarningBanner";
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
import { HeaderAudioStatus } from "../../components/HeaderAudioStatus";
import { useCustomerChatAlerts } from "./hooks/useCustomerChatAlerts";
import { CustomerChatToastContainer } from "./components/CustomerChatToastContainer";
import { useRiderChatAlerts } from "./hooks/useRiderChatAlerts";
import { RiderChatToastContainer } from "./components/RiderChatToastContainer";
import { useRiderFleetPresence } from "../../hooks/useRiderFleetPresence";
import { fetchStaffPhoto } from "../../services/staffPhotoService";
import { useDeviceTier } from "../../hooks/useDeviceTier";
import { MobileHeader } from "../../components/navigation/MobileHeader";
import { MobileBottomNav, type MobileNavTab } from "../../components/navigation/MobileBottomNav";
import { ScrollToTopButton } from "../../components/common/ScrollToTopButton";
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
  const { riders, telemetryError: fleetTelemetryError, liveLink: fleetLiveLink } = useRiderFleetPresence({
    alertOnSignalLost: true,
  });
  const exceptionQueue = useOpenExceptions();
  const maintenance = useMaintenanceCheck("dispatcher");

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

  const {
    unreadCounts,
    totalUnreadCount,
    activeToasts,
    dismissToast,
    markErrandAsRead,
  } = useCustomerChatAlerts({
    errands,
    activeErrandId: selectedErrandId,
    onOpenChat: handleOpenChat,
  });

  const [selectedRiderIdForChat, setSelectedRiderIdForChat] = useState<string | null>(null);

  const handleOpenRiderChat = useCallback((riderId: string) => {
    setSelectedRiderIdForChat(riderId);
    setActiveTab("messages");
  }, [setActiveTab]);

  const {
    unreadCounts: riderUnreadCounts,
    totalUnreadCount: totalRiderUnreadCount,
    activeToasts: riderToasts,
    dismissToast: dismissRiderToast,
    markRiderAsRead,
  } = useRiderChatAlerts({
    riders,
    activeRiderId: activeTab === "messages" ? selectedRiderIdForChat : null,
    onOpenRiderChat: handleOpenRiderChat,
  });

  useEffect(() => {
    const handleOpenErrandEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ errandId?: string }>;
      const errandId = customEvent.detail?.errandId;
      if (errandId) {
        markErrandAsRead(errandId);
        handleOpenChat(errandId);
      }
    };
    window.addEventListener("sugo:open-errand", handleOpenErrandEvent);
    return () => window.removeEventListener("sugo:open-errand", handleOpenErrandEvent);
  }, [handleOpenChat, markErrandAsRead]);

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

  const { isMobile } = useDeviceTier();

  const mobilePrimaryTabs: MobileNavTab[] = [
    {
      id: "queue",
      label: "Queue",
      icon: <ClipboardList className="w-5 h-5" />,
      badge: availableCount > 0 ? availableCount : undefined,
      isActive: activeTab === "queue",
      onClick: () => setActiveTab("queue"),
    },
    {
      id: "active_errands",
      label: "Active",
      icon: <Bike className="w-5 h-5" />,
      badge: totalUnreadCount > 0 ? `${totalUnreadCount} new` : activeCount > 0 ? activeCount : undefined,
      isActive: activeTab === "active_errands",
      onClick: () => setActiveTab("active_errands"),
    },
    {
      id: "exceptions",
      label: "Conflict",
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: exceptionCount > 0 ? exceptionCount : undefined,
      isActive: activeTab === "exceptions",
      onClick: () => setActiveTab("exceptions"),
    },
    {
      id: "riders",
      label: "Tracking",
      icon: <Activity className="w-5 h-5" />,
      badge: onlineRidersCount > 0 ? onlineRidersCount : undefined,
      isActive: activeTab === "riders",
      onClick: () => setActiveTab("riders"),
    },
  ];

  const mobileMoreTabs: MobileNavTab[] = [
    {
      id: "messages",
      label: "Rider Messages",
      icon: <MessageSquare className="w-5 h-5" />,
      badge: totalRiderUnreadCount > 0 ? totalRiderUnreadCount : undefined,
      isActive: activeTab === "messages",
      onClick: () => setActiveTab("messages"),
      description: "Internal communication with on-duty riders",
    },
    {
      id: "recent_chats",
      label: "Customer Chats",
      icon: <MessageCircle className="w-5 h-5" />,
      badge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
      isActive: activeTab === "recent_chats",
      onClick: () => setActiveTab("recent_chats"),
      description: "Customer support inquiry logs & active chats",
    },
    {
      id: "profile",
      label: "Profile & Settings",
      icon: <BikeIcon className="w-5 h-5" />,
      isActive: activeTab === "profile",
      onClick: () => setActiveTab("profile"),
      description: "Dispatcher account, security logs & active sessions",
    },
  ];

  return (
    <>
      {maintenance.showWarningBanner && (
        <MaintenanceWarningBanner
          portal="dispatcher"
          maintenanceType={maintenance.maintenanceType}
          countdownSeconds={maintenance.countdownSeconds}
          header={maintenance.header}
          customColor={maintenance.customColor}
        />
      )}
      {maintenance.showFullScreenOverlay && (
        <MaintenanceOverlay
          portal="dispatcher"
          header={maintenance.header}
          message={maintenance.message}
          notice={maintenance.notice}
          maintenanceType={maintenance.maintenanceType}
          supportContact={maintenance.supportContact}
          customColor={maintenance.customColor}
        />
      )}
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
          {!isMobile && (
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
                    Dispatcher Console • Tacurong
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
              {/* Operations Group */}
              <SidebarGroup className="p-0 space-y-1">
                <SidebarGroupLabel className="px-3 text-micro uppercase text-board-trim group-data-[collapsible=icon]:hidden">
                  Operations
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {/* Dispatcher Management (formerly Order Queue) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("queue")}
                        isActive={activeTab === "queue"}
                        tooltip={availableCount > 0 ? `Dispatcher Management (${availableCount} available)` : "Dispatcher Management"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "queue"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <ClipboardList
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "queue" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {availableCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-[#0F2035]" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Dispatcher Management
                          </span>
                        </div>
                        {availableCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden font-mono text-micro px-2 py-0.5 rounded-full ${
                              activeTab === "queue"
                                ? "bg-white/20 text-board-plate"
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
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "active_errands"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <Activity
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "active_errands" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {totalUnreadCount > 0 ? (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-[#0F2035] animate-pulse" />
                            ) : activeCount > 0 ? (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0F2035]" />
                            ) : null}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Active Errands
                          </span>
                        </div>
                        {(activeCount > 0 || totalUnreadCount > 0) && (
                          <div className="group-data-[collapsible=icon]:hidden flex items-center gap-1.5 shrink-0">
                            {totalUnreadCount > 0 && (
                              <span className="font-mono text-micro px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                {totalUnreadCount} new
                              </span>
                            )}
                            {activeCount > 0 && (
                              <span
                                className={`font-mono text-micro px-2 py-0.5 rounded-full ${
                                  activeTab === "active_errands"
                                    ? "bg-white/20 text-board-plate"
                                    : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                                }`}
                              >
                                {activeCount}
                              </span>
                            )}
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Conflict Management (formerly Needs a Decision) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("exceptions")}
                        isActive={activeTab === "exceptions"}
                        tooltip={exceptionCount > 0 ? `Conflict Management (${exceptionCount} urgent)` : "Conflict Management"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "exceptions"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <AlertTriangle
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "exceptions" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {exceptionCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-red-500 ring-2 ring-[#0F2035] animate-pulse" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Conflict Management
                          </span>
                        </div>
                        {exceptionCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden font-mono text-micro px-2 py-0.5 rounded-full ${
                              activeTab === "exceptions"
                                ? "bg-white/20 text-board-plate"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {exceptionCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Tracking (formerly Fleet Tracking) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("riders")}
                        isActive={activeTab === "riders"}
                        tooltip={riders.length > 0 ? `Tracking (${onlineRidersCount}/${riders.length} online)` : "Tracking"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "riders"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <Bike
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "riders" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {onlineRidersCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-[#0F2035]" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Tracking
                          </span>
                        </div>
                        {riders.length > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden font-mono text-micro px-2 py-0.5 rounded-full ${
                              activeTab === "riders"
                                ? "bg-white/20 text-board-plate"
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
                <SidebarGroupLabel className="px-3 text-micro uppercase text-board-trim group-data-[collapsible=icon]:hidden">
                  Communications
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {/* Rider Messages */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("messages")}
                        isActive={activeTab === "messages"}
                        tooltip={totalRiderUnreadCount > 0 ? `Rider Messages (${totalRiderUnreadCount} unread)` : "Rider Messages"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "messages"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <MessageSquare
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "messages" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {totalRiderUnreadCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-sky-400 ring-2 ring-[#0F2035] animate-pulse" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Rider Messages
                          </span>
                        </div>
                        {totalRiderUnreadCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden font-mono text-micro px-2 py-0.5 rounded-full ${
                              activeTab === "messages"
                                ? "bg-white/20 text-board-plate"
                                : "bg-sky-400/20 text-sky-300 border border-sky-400/30 animate-pulse"
                            }`}
                          >
                            {totalRiderUnreadCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Customer Chat History (formerly Customer Chats) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("recent_chats")}
                        isActive={activeTab === "recent_chats"}
                        tooltip={totalUnreadCount > 0 ? `Customer Chat History (${totalUnreadCount} unread)` : "Customer Chat History"}
                        size="default"
                        className={`w-full flex items-center justify-between px-3 h-10 rounded-plate text-label transition-colors duration-200 group-data-[collapsible=icon]:rounded-trim group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "recent_chats"
                            ? "bg-signal text-board-plate"
                            : "text-board-trim hover:bg-white/10 hover:text-board-plate"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:gap-0">
                          <div className="relative flex items-center justify-center shrink-0">
                            <MessageCircle
                              size={16}
                              className={`shrink-0 transition-colors ${
                                activeTab === "recent_chats" ? "text-board-plate" : "text-board-trim group-hover:text-board-plate"
                              }`}
                            />
                            {totalUnreadCount > 0 && (
                              <span className="hidden group-data-[collapsible=icon]:block absolute -top-1 -right-1 size-2 rounded-full bg-amber-400 ring-2 ring-[#0F2035] animate-pulse" />
                            )}
                          </div>
                          <span className="inline-block truncate transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                            Customer Chat History
                          </span>
                        </div>
                        {totalUnreadCount > 0 && (
                          <span
                            className={`group-data-[collapsible=icon]:hidden font-mono text-micro px-2 py-0.5 rounded-full ${
                              activeTab === "recent_chats"
                                ? "bg-white/20 text-board-plate"
                                : "bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse"
                            }`}
                          >
                            {totalUnreadCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {/* Sidebar User Profile & Sign Out Footer */}
            <SidebarFooter className="p-3 border-t border-white/10 group-data-[collapsible=icon]:p-2.5 transition-all duration-300 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                title="Profile & Settings"
                className={`flex items-center gap-2.5 px-3 py-1 min-w-0 group-data-[collapsible=icon]:hidden text-left rounded-plate ${
                  activeTab === "profile" ? "bg-white/10" : "hover:bg-white/5"
                } transition-colors cursor-pointer w-full`}
              >
                <div
                  className="w-9 h-9 rounded-plate bg-signal flex items-center justify-center text-board-plate text-micro shrink-0 ring-1 ring-white/10 overflow-hidden"
                  title={user?.name || "Duty Dispatcher"}
                >
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
                <div className="min-w-0 opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="truncate text-label text-board-plate">
                    {user?.name || "Duty Dispatcher"}
                  </p>
                  <p className="truncate font-mono text-micro text-board-trim">
                    {user?.email || "dispatcher@sugo.ph"}
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
          )}

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
          <SidebarInset className="bg-transparent shadow-none rounded-none m-0 peer-data-[variant=inset]:m-0 peer-data-[variant=inset]:rounded-none peer-data-[variant=inset]:shadow-none w-full relative flex flex-col h-full min-h-0 overflow-hidden">
            {isMobile && (
              <MobileHeader
                title="SUGO Dispatch"
                subtitle={signedRun ? formatErrandId(signedRun.id) : `${(user?.name || "Duty Dispatcher").split(" ")[0]} • Tacurong`}
                rightElement={
                  <div className="flex items-center gap-1.5">
                    <HeaderAudioStatus />
                    <HeaderClock />
                    <NotificationBell />
                    <button
                      type="button"
                      onClick={() => setShowSignOutConfirm(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                }
              />
            )}
            {/* The console's own surface. Every token and browser-surface rule
                in src/styles/surfaces.css is scoped to this attribute, which is
                what keeps the route board out of the Owner portal. */}
            <main
              data-surface="dispatch"
              className={cn(
                "flex h-screen w-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4",
                isMobile && "pb-20 pt-1"
              )}
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
                          "Dispatch Management"
                        : "Dispatch Management"}
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
                      <p className="text-micro uppercase text-board-trim">Conflict Management</p>
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
                      <HeaderAudioStatus />
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
                    unreadCounts={unreadCounts}
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
                    unreadCounts={unreadCounts}
                    isLoading={isLoading}
                    loadError={loadError}
                    onRetry={fetchOrders}
                  />
                )}
                {activeTab === "exceptions" && <ExceptionQueuePanel queue={exceptionQueue} />}
                {activeTab === "riders" && (
                  <RiderFleetRoster
                    riders={riders}
                    telemetryError={fleetTelemetryError}
                    errands={errands}
                    liveLink={fleetLiveLink}
                  />
                )}
                {activeTab === "messages" && (
                  <DispatcherRiderMessagesPanel
                    errands={errands}
                    riders={riders}
                    dispatcher={user}
                    selectedRiderId={selectedRiderIdForChat}
                    onSelectRiderId={(rId) => {
                      setSelectedRiderIdForChat(rId);
                      markRiderAsRead(rId);
                    }}
                    unreadCounts={riderUnreadCounts}
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
          
          {/* Full-screen order chat: the conversation and the three dispatch
              steps. Opening it accepts the order (onVerify), so there is no
              return-to-queue from inside it any more. */}
          {selectedErrandId && (
            <OrderChatScreen
              orderId={selectedErrandId}
              dispatcher={user}
              onClose={handleCloseChat}
              onRefreshOrders={fetchOrders}
              readOnly={activeTab === "recent_chats"}
              onVerify={(id) => handleVerifyErrand(id, user)}
              onDecline={async (id, reason) => {
                await handleDeclineOrder(id, reason);
                handleCloseChat();
              }}
            />
          )}

          {isMobile && (
            <MobileBottomNav primaryTabs={mobilePrimaryTabs} moreTabs={mobileMoreTabs} />
          )}
          <ScrollToTopButton />
          <CustomerChatToastContainer
            toasts={activeToasts}
            onDismiss={dismissToast}
            onOpenChat={(id) => {
              markErrandAsRead(id);
              handleOpenChat(id);
            }}
          />
          <RiderChatToastContainer
            toasts={riderToasts}
            onDismiss={dismissRiderToast}
            onOpenRiderChat={handleOpenRiderChat}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
      </TooltipProvider>
    </>
  );
}
