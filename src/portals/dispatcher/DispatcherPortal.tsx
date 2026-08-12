import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useDispatcherPortal } from "./hooks/useDispatcherPortal";
import { ErrandQueueTable } from "./components/ErrandQueueTable";
import { RiderFleetRoster } from "./components/RiderFleetRoster";
import { DispatcherChatPanel } from "./components/DispatcherChatPanel";
import {
  ClipboardList, Bike, LogOut, Clock, Zap, Bike as BikeIcon, MessageSquare, X
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

export default function DispatcherPortal() {
  const { user, logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const {
    activeTab,
    setActiveTab,
    errands,
    riders,
    selectedErrandId,
    fetchOrders,
    handleClaimOrder,
    handleOpenChat,
    handleCloseChat,
    handleUpdateStatus,
  } = useDispatcherPortal(user?.id);

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

            <SidebarContent className="px-2 py-1.5 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3 transition-all duration-300 ease-in-out">
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("queue")}
                        isActive={activeTab === "queue"}
                        tooltip="Errand Queue"
                        size="default"
                        className={`w-full flex items-center gap-2.5 px-3 h-10.5 rounded-none border-l-[3px] text-sm font-bold transition-all duration-300 ease-in-out group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "queue"
                            ? "border-l-blue-400 bg-white/10 text-white"
                            : "border-l-transparent text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <ClipboardList size={18} className="shrink-0 transition-all duration-300 ease-in-out" />
                        <span className="inline-block truncate transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">Errand Queue</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("riders")}
                        isActive={activeTab === "riders"}
                        tooltip="Rider Monitoring"
                        size="default"
                        className={`w-full flex items-center gap-2.5 px-3 h-10.5 rounded-none border-l-[3px] text-sm font-bold transition-all duration-300 ease-in-out group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "riders"
                            ? "border-l-blue-400 bg-white/10 text-white"
                            : "border-l-transparent text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Bike size={18} className="shrink-0 transition-all duration-300 ease-in-out" />
                        <span className="inline-block truncate transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">Rider Monitoring</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => setActiveTab("recent_chats")}
                        isActive={activeTab === "recent_chats"}
                        tooltip="Recent Customer Chats"
                        size="default"
                        className={`w-full flex items-center gap-2.5 px-3 h-10.5 rounded-none border-l-[3px] text-sm font-bold transition-all duration-300 ease-in-out group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:size-9! ${
                          activeTab === "recent_chats"
                            ? "border-l-blue-400 bg-white/10 text-white"
                            : "border-l-transparent text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <MessageSquare size={18} className="shrink-0 transition-all duration-300 ease-in-out" />
                        <span className="inline-block truncate transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">Recent Customer Chats</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-2.5 border-t border-white/10 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:py-3 transition-all duration-300 ease-in-out gap-1.5">
              <div className="flex items-center gap-2.5 mb-0.5 min-w-0 group-data-[collapsible=icon]:hidden transition-all duration-300 ease-in-out">
                <div 
                  className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md transition-all duration-300 ease-in-out"
                  title={user?.name || "Mark Dennis Batcharo"}
                >
                  {(user?.name || "Mark Dennis Batcharo").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 transition-all duration-300 ease-in-out opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:pointer-events-none overflow-hidden whitespace-nowrap">
                  <p className="text-[13px] font-bold text-white truncate">{user?.name || "Mark Dennis Batcharo"}</p>
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
          <main className="flex-1 p-8 overflow-y-auto space-y-8 h-screen w-full">
            <header className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Live Dispatch Operations</h1>
                  <p className="text-sm text-slate-500 mt-0.5">Your dedicated console for coordinating deliveries in real time</p>
                </div>
              </div>
              <ServerStatusBadge />
            </header>

            {/* Operational Status Cards */}
            <section className="grid grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">Available Queue</p>
                  <p className="text-2xl font-extrabold text-slate-800">{errands.filter((e) => String(e.status).toUpperCase() === "AVAILABLE").length} Errands</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">In Route / Active Deliveries</p>
                  <p className="text-2xl font-extrabold text-slate-800">
                    {
                      errands.filter((e) => {
                        const s = String(e.status).toUpperCase();
                        return s !== "AVAILABLE" && s !== "CANCELLED" && s !== "PASSING BY" && s !== "COMPLETED";
                      }).length
                    }{" "}
                    Errands
                  </p>
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
            {activeTab === "queue" && (
              <ErrandQueueTable
                errands={errands}
                currentUser={user}
                onClaimOrder={handleClaimOrder}
                onOpenChat={handleOpenChat}
                onUpdateStatus={handleUpdateStatus}
              />
            )}
            {activeTab === "riders" && <RiderFleetRoster riders={riders} />}
            {activeTab === "recent_chats" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-lg font-extrabold text-slate-800">💬 Recent Customer Chats — Closed & Archived</h3>
                <p className="text-sm text-slate-500">A history of customer conversations from errands that have since been completed or handed off to a rider.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-extrabold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Errand ID</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {errands
                        .filter((e) => String(e.status).toUpperCase() !== "AVAILABLE")
                        .map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 font-mono font-bold text-[#1E3A5F]">{e.id}</td>
                            <td className="p-4 font-bold text-slate-800">{e.customerName}</td>
                            <td className="p-4">{e.category}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {e.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleOpenChat(e.id)}
                                className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
                              >
                                View Chat Logs
                              </button>
                            </td>
                          </tr>
                        ))}
                      {errands.filter((e) => String(e.status).toUpperCase() !== "AVAILABLE").length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                            No closed customer chats recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
