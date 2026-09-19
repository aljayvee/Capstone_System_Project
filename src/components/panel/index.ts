/**
 * The panel primitives, under names that belong to no single portal.
 *
 * These eight components were built for the dispatcher console and lived at
 * `src/portals/dispatcher/components/ui/`. They are now shared: the Owner
 * Portal runs on the same design system, and the only thing that differs
 * between the two is the value of eight colour tokens (see
 * `src/styles/owner.css`). Because every token utility compiles to a `var()`
 * reference, these components render in either skin without a line of change.
 *
 * Five of them still carry `Dispatcher*` in their declared names, which is
 * historical rather than meaningful. Renaming the symbols would have touched
 * every JSX call site across 25 dispatcher files for no behavioural gain, so
 * this barrel supplies portal-neutral names instead and the dispatcher keeps
 * importing the files directly. New code, in either portal, should import
 * from here.
 *
 * Contracts worth knowing before you use them:
 *
 *   PanelShell   three pinned zones and exactly one scroller; owns all the
 *                viewport maths so no panel does its own arithmetic.
 *   PanelState   { isLoading, error, isEmpty, hasFilters, onRetry,
 *                onResetFilters }. Orders `error` BEFORE `isEmpty`, so no
 *                code path can render a failed request as an all-clear.
 *   Field        a render prop handing you { id, aria-describedby,
 *                aria-invalid } from useId. It cannot be rendered without
 *                wiring its label, which is the point.
 *   PanelCard    plate, plus .Region (a ground change and a macro-gap, never
 *                a second box), .Label and .Header.
 *   StatusChip   the only correct way to render an errand status. Fed by
 *                `src/lib/statusPresentation`, which resolves an unknown
 *                status to neutral rather than guessing.
 */

export { PanelShell, type PanelFigure } from "./PanelShell";
export { PanelState } from "./PanelState";
export { ConfirmDialog } from "./ConfirmDialog";
export { Field, fieldInputClasses } from "./Field";
export { DispatcherCard as PanelCard } from "./DispatcherCard";
export {
  DispatcherButton as PanelButton,
  type DispatcherButtonProps as PanelButtonProps,
} from "./DispatcherButton";
export { StatusChip, type DispatcherBadgeVariant as StatusChipVariant } from "./DispatcherBadge";
export {
  DispatcherInlineBanner as InlineBanner,
  useInlineMessage,
  type InlineMessage,
} from "./DispatcherInlineBanner";
export {
  DispatcherSearchField as SearchField,
  type DispatcherSearchFieldProps as SearchFieldProps,
} from "./DispatcherSearchField";
