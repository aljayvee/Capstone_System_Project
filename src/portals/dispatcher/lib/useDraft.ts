import * as React from "react";

/**
 * A text draft that survives its own component unmounting.
 *
 * CLAUDE.md requires preserved unsubmitted form drafts. Two places in this
 * console lost them, and both are fixed through this hook.
 *
 * The exception queue held one shared `reason` string for every row, and
 * opening a second row reset it, so a half-typed justification on row A was
 * wiped by clicking into row B. That text becomes the audit trail for money
 * held against a customer, which makes it the worse of the two.
 *
 * The inspector never reset `declineReason` when the selected errand changed,
 * which is the same bug pointing the other way: a reason typed against errand
 * A stayed in the box, and was submittable, against errand B.
 *
 * Both are the same missing idea. A draft belongs to a key, not to a component
 * instance: keying by row or errand id isolates drafts from each other, and
 * holding them outside React lets them outlive the unmount.
 *
 * The profile form is the third, and the finish reviewer was right that it
 * splits into two decisions rather than one. Its four identity fields are
 * drafted here, keyed by user id. Its three password fields are NOT, and will
 * not be: a plaintext password sitting in a module-level map after the
 * operator has walked away from a shared console is a worse outcome than
 * retyping one.
 *
 * Drafting an edit to server-loaded data needs one extra idea, which is the
 * fourth element of the returned tuple. `seed` fills the visible value from a
 * fetch ONLY when no unsaved edit exists, and it never writes to the store.
 * So the map holds nothing but real user edits: an unsaved edit outranks a
 * later refetch, and a refetch cannot manufacture a draft that then goes
 * stale forever.
 *
 * Deliberately in memory rather than sessionStorage. This survives tab
 * switches, panel remounts and errand selection, which is the reported bug; it
 * does not survive a reload, and half-typed justifications for money decisions
 * are not something to silently resurrect days later on a shared machine.
 */

const drafts = new Map<string, string>();

export function useDraft(
  key: string,
  initial = ""
): [string, (next: string) => void, () => void, (value: string) => void] {
  const [value, setValue] = React.useState(() => drafts.get(key) ?? initial);

  // Re-keying is a different draft, not an edit to this one: reading the store
  // on key change is what isolates errand A's decline reason from errand B's.
  React.useEffect(() => {
    setValue(drafts.get(key) ?? initial);
    // `initial` is deliberately not a dependency. A caller that recomputes it
    // every render would otherwise clobber what the dispatcher is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = React.useCallback(
    (next: string) => {
      drafts.set(key, next);
      setValue(next);
    },
    [key]
  );

  /** Call after a successful submit, so a sent reason does not reappear. */
  const clear = React.useCallback(() => {
    drafts.delete(key);
    setValue("");
  }, [key]);

  /**
   * Fill from the server, but never over an unsaved edit, and never into the
   * store. State only: a fetch is not a draft.
   */
  const seed = React.useCallback(
    (next: string) => {
      if (drafts.has(key)) return;
      setValue(next);
    },
    [key]
  );

  return [value, update, clear, seed];
}

/**
 * Drop every draft under a prefix without touching what is on screen.
 *
 * `clear` above is for a draft whose text has been SENT: it blanks the box so
 * a submitted decline reason cannot reappear. A saved form is the opposite
 * case — the values are now correct and should stay visible — so blanking
 * them would be a bug. This forgets the drafts and leaves the fields alone,
 * which lets the next fetch seed them normally.
 */
export function forgetDrafts(keyPrefix: string): void {
  for (const key of Array.from(drafts.keys())) {
    if (key.startsWith(keyPrefix)) drafts.delete(key);
  }
}
