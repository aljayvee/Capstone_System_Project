import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import PlacesTab from "../modules/merchants/components/PlacesTab";
import { OwnerPanelShell } from "../components/OwnerPanelShell";

/**
 * The verified-places directory at `/places`.
 *
 * This file was 953 lines and **894 of them were identical** to
 * `modules/merchants/components/PlacesTab.tsx` (923 lines). Two copies of one
 * screen: the same interfaces, the same handlers, the same Google Maps
 * bootstrap, the same table, the same create/edit modal. It is now the route
 * shell around that one component, and the duplicate is gone.
 *
 * Three things made the duplication worse than ordinary redundancy.
 *
 * NOBODY COULD REACH IT. Both in-portal entry points to `/places` are gated
 * off: `CategoryCard.tsx` renders its `<Link>` only when
 * `onSelectCategoryForPlaces` is undefined, and `MerchantCategoryModule`
 * always passes it. So 953 lines were reachable only by typing the URL, while
 * every click went to the tab copy.
 *
 * THEY HAD ALREADY DIVERGED, over data. `PlacesTab` filters the list through
 * `livePlaces`, which drops retired stores on the stated grounds that
 * "retired stores live in the Archive tab and nowhere else". This copy never
 * had that filter, so the two screens disagreed about whether an archived
 * store still appears in the directory. Consolidating settles it on the
 * documented behaviour.
 *
 * AND IT DOUBLED EVERY FIX. Each of the three swallowed `console.warn`
 * catches, the `window.confirm` delete, the `alert()` failure path and the
 * dead `isMapReady` existed twice, at parallel line numbers, waiting to be
 * fixed twice and then to drift again.
 *
 * `PlacesTab` reads `?categoryId=` from the URL itself and both its props are
 * optional, so it needs nothing from this shell but a flex parent with a
 * definite height.
 *
 * Wording is frozen: the title, the strapline and the back link all carry the
 * exact strings this screen rendered before.
 */
export default function PlacesDirectoryScreen() {
  return (
    // data-surface here as well as on OwnerPortal: this is a top-level route,
    // so it renders outside the portal shell and would otherwise get none of
    // the design system and none of the owner skin.
    <div
      data-surface="owner"
      data-portal="owner"
      className="flex h-screen w-full flex-col overflow-hidden bg-board-ground p-4 text-ink sm:p-6"
    >
      <OwnerPanelShell
        title="Verified Places Directory"
        detail="Tacurong City Verified Establishments & GPS Coordinates"
        aside={
          <Link
            to="/owner?module=merchants"
            title="Back to Merchants Category"
            className="flex min-h-9 items-center gap-2 rounded-plate border border-edge bg-board-plate px-3 text-micro uppercase text-ink-muted transition-colors hover:bg-board-ground hover:text-ink"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to Categories</span>
          </Link>
        }
      >
        {/* PlacesTab's root is `flex-1 min-h-0`, so it needs a flex column
            with a resolved height rather than the shell's plain scroller. */}
        <div className="flex h-full min-h-0 flex-col">
          <PlacesTab />
        </div>
      </OwnerPanelShell>
    </div>
  );
}
