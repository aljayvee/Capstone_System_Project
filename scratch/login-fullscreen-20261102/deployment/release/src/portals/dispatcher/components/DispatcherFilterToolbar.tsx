import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DispatcherFilterToolbarProps {
  filters: ReactNode;
  search: ReactNode;
  sort?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function DispatcherFilterToolbar({ filters, search, sort, actions, className }: DispatcherFilterToolbarProps) {
  return (
    <div data-dispatcher-filter-toolbar className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      {filters}
      <div className="ml-auto flex w-full flex-wrap items-center gap-2 md:w-auto">
        <div className="w-full min-w-0 md:w-72">{search}</div>
        {sort}
        {actions}
      </div>
    </div>
  );
}
