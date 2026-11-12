import type { ReactNode } from "react";
import { HeaderAudioStatus } from "@/components/HeaderAudioStatus";
import { HeaderClock } from "@/components/HeaderClock";
import { NotificationBell } from "@/components/NotificationBell";

export function DispatcherHeaderActions({ children }: { children?: ReactNode }) {
  return (
    <div data-dispatcher-header-actions className="flex h-10 shrink-0 items-center justify-end gap-2">
      {children}
      <HeaderAudioStatus />
      <div className="hidden md:block"><HeaderClock /></div>
      <NotificationBell />
    </div>
  );
}
