import * as React from "react";
import { HeaderClock } from "@/components/HeaderClock";
import { NotificationBell } from "@/components/NotificationBell";

interface OwnerPageHeaderProps {
  title: React.ReactNode;
  detail?: React.ReactNode;
  controls?: React.ReactNode;
}

export function OwnerPageHeader({ title, detail, controls }: OwnerPageHeaderProps) {
  return (
    <header data-owner-header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="col-start-1 row-start-1 flex min-h-10 min-w-0 flex-col justify-center">
        <h1 className="truncate text-title uppercase text-ink">{title}</h1>
        {detail ? <p className="mt-0.5 text-label text-ink-muted">{detail}</p> : null}
      </div>
      {controls ? (
        <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 flex-wrap items-center justify-end gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:min-h-10">
          {controls}
        </div>
      ) : null}
      {/* Keep utilities on the first row regardless of page actions or title length. */}
      <div className="col-start-2 row-start-1 flex h-10 shrink-0 items-center gap-2 lg:col-start-3">
        <div className="hidden sm:block"><HeaderClock /></div>
        <NotificationBell />
      </div>
    </header>
  );
}
