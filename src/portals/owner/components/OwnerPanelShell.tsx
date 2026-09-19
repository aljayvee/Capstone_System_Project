import * as React from "react";
import { PanelShell, type PanelFigure } from "@/components/panel";
import { NotificationBell } from "@/components/NotificationBell";
import { HeaderClock } from "@/components/HeaderClock";

/**
 * The shape every screen in the Owner Portal takes.
 *
 * This replaces five of eight hand-rolled copies of one header. Every module
 * opened with the same block: a white plate at a 16px radius carrying a drop
 * shadow, a tinted icon chip, a page title set at 18 to 20px in weight 800,
 * and its own HeaderClock and NotificationBell.
 *
 * FIVE OF EIGHT, stated plainly because this docstring used to claim all
 * eight. Users, Merchants and Tracking still build their own header row: each
 * has a body that is a flex-1 chain around a map or a dual-view pane, and the
 * shell cannot own their height until those are restructured. What they no
 * longer have is a DIFFERENT header - the plate and the tinted chip are gone
 * from them too, their titles are h1 in the same board caps at the same
 * scale, and they sit on the same hairline. So the portal has one header
 * TREATMENT on all eight screens and one header COMPONENT on five. The
 * remaining cost is real and worth naming: four copies of the row markup, and
 * four places mounting HeaderClock and NotificationBell rather than one.
 *
 * (Described rather than quoted on purpose. This docstring previously showed
 * the old markup verbatim, and the geometry and type sweeps that replaced that
 * markup rewrote the quotation too, so the comment ended up describing the new
 * code as though it were the old.)
 *
 * Eight copies meant eight places to fix anything, and they had already
 * drifted: the tinted chip came in blue on four modules, amber on Riders,
 * emerald on Service Rates and purple on Reports, which is colour assigned
 * per module rather than per meaning. `OwnerPortal.tsx` rendered no header at
 * all, so the clock and the notification bell were mounted eight times over.
 *
 * Three things this fixes beyond the duplication.
 *
 * THE TINTED ICON CHIP IS GONE. It is the single most category-generic element
 * in this codebase, and the craft floor bans it outright: the header is
 * typography-first per AGENTS.md 8.13. Twenty-one of them sat beside headings
 * across the portal.
 *
 * THE HEADING OUTLINE NOW READS. The portal had exactly one <h1> in 34 files
 * (PlacesDirectoryScreen, set at 14px), so seven of its eight screens had no
 * top-level heading while the sidebar brand <h2> sat as a DOM peer of every
 * module title. This sets the page <h1> once, in one place, which is also
 * what lets the levels below it stop skipping from h2 to h5.
 *
 * NO HEADER CARD. The old block was a white plate with a 16px radius and a
 * drop shadow, which AGENT_HANDSHAKE.md's [LOCKED] Flat Design Surface Purity
 * invariant prohibits outright. The title now sits on the working ground with
 * a hairline under the whole pinned zone, so the boundary is a rule rather
 * than a box. That is the flat reading, and it is one less container between
 * the reader and the content.
 *
 * Wording is frozen by instruction: every module passes the exact title string
 * it rendered before, byte for byte.
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
   * chip. Sits to the LEFT of the clock and the bell, which is where all five
   * modules that had one already put it.
   */
  aside?: React.ReactNode;
  /**
   * The screen's primary action. Sits to the RIGHT of the clock and the bell,
   * furthest from the title, which is where Users and Merchants already had
   * theirs. A separate slot rather than more `aside` because an action that
   * commits something should not be interleaved with read-only chrome.
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
      aside={
        <>
          {aside}
          {/* Mounted once here instead of once per module. Both sit on the
              light ground rather than a navy field, so they keep their own
              light styling and need no data-on-field. */}
          <HeaderClock />
          <NotificationBell />
          {action}
        </>
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
