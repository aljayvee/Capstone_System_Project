import * as React from "react";
import { PanelShell, type PanelFigure } from "@/components/panel";
import { OwnerPageHeader } from "./OwnerPageHeader";

/**
 * Keeps owner content and controls in the pinned panel layout. Users,
 * Merchants and Tracking use OwnerPageHeader directly for their split panes,
 * so every owner screen shares the same title and notification geometry.
 */

interface OwnerPanelShellProps {
  /** The screen title. Passed through verbatim; wording is frozen. */
  title: React.ReactNode;
  /** Short line under the title. Optional, and nothing uses it yet. */
  detail?: React.ReactNode;
  /** The screen's headline count, painted on the navy field. */
  figure?: PanelFigure;
  /**
   * Module controls that belong on the title row: a period selector, a status
   * chip. Sits before the shared clock and notification utilities.
   */
  aside?: React.ReactNode;
  /**
   * The screen's primary action, grouped with its module controls.
   */
  action?: React.ReactNode;
  /** Pinned strip under the header: search, segmented tabs, filter capsules. */
  controls?: React.ReactNode;
  /** Pinned below the scroller: pagination, totals, a save bar. */
  footer?: React.ReactNode;
  /** The one scrolling region. */
  children: React.ReactNode;
  className?: string;
}

export function OwnerPanelShell({
  title,
  detail,
  figure,
  aside,
  action,
  controls,
  footer,
  children,
  className,
}: OwnerPanelShellProps) {
  return (
    <PanelShell
      // The Owner Portal has no destination band, so the screen title is the
      // top of this document rather than a section within one.
      headingLevel="h1"
      title={title}
      detail={detail}
      figure={figure}
      header={
        <OwnerPageHeader
          title={title}
          detail={detail}
          controls={figure || aside || action ? <>
            {figure ? (
              <div data-on-field className="shrink-0 rounded-plate bg-board-field px-3 py-1.5 shadow-field">
                <p className="text-micro uppercase text-board-trim">{figure.label}</p>
                <p data-figure className={`text-title tabular-nums ${figure.urgent ? "text-signal-on-field" : "text-board-plate"}`}>
                  {figure.value}
                </p>
              </div>
            ) : null}
            {aside}
            {action}
          </> : undefined}
        />
      }
      controls={controls}
      footer={footer}
      // max-w-7xl was repeated on all eight module roots. It belongs here, so
      // the measure is stated once and every screen shares it.
      className={className ? `mx-auto max-w-7xl ${className}` : "mx-auto max-w-7xl"}
    >
      {children}
    </PanelShell>
  );
}
