import React, { useEffect, useState } from "react";
import { DispatcherSearchField } from "../../../../../components/panel/DispatcherSearchField";

export interface RiderOption {
  riderId: number;
  name: string;
}

/**
 * A rider name search followed by the rider dropdown, for the reports that
 * can be narrowed to one rider (Rider Performance, Commission).
 *
 * The search narrows the dropdown, so a long roster is not scrolled by hand.
 * Every word typed must appear in the name. The rider already chosen stays in
 * the list, or the select would show a value it no longer has. Enter with
 * exactly one match opens that rider, and so does a search that names only one.
 */
export function RiderSearchPicker({
  options,
  value,
  onChange,
}: {
  options: RiderOption[];
  value: number | null;
  onChange: (riderId: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const nameMatches = (o: RiderOption) => words.every((w) => o.name.toLowerCase().includes(w));
  const shown = options.filter((o) => o.riderId === value || nameMatches(o));
  const matchCount = options.filter(nameMatches).length;

  // Once the search names exactly one rider, open them: no click or Enter.
  // Keyed on the typing only, so "Show all riders" is not undone by a search
  // still sitting in the box. A short pause first, so a half-typed name does
  // not load a report on every key.
  useEffect(() => {
    if (words.length === 0) return;
    const only = options.filter(nameMatches);
    if (only.length !== 1 || only[0].riderId === value) return;
    const timer = window.setTimeout(() => onChange(only[0].riderId), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-52">
        <DispatcherSearchField
          aria-label="Search riders by name"
          placeholder="Search rider name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            const only = options.filter(nameMatches);
            if (e.key === "Enter" && words.length > 0 && only.length === 1) onChange(only[0].riderId);
          }}
          disabled={options.length === 0}
        />
      </div>
      <label className="flex items-center gap-2 text-label text-ink-muted">
        <span>Rider</span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={options.length === 0}
          className="max-w-[16rem] rounded-plate border border-edge bg-board-plate px-3 py-2 text-label text-ink disabled:opacity-50"
        >
          <option value="">
            {words.length > 0 ? `All riders (${matchCount} of ${options.length} match)` : "All riders"}
          </option>
          {shown.map((o) => (
            <option key={o.riderId} value={o.riderId}>
              {o.name}
            </option>
          ))}
          {words.length > 0 && matchCount === 0 ? (
            <option value="" disabled>
              No rider matches "{query.trim()}"
            </option>
          ) : null}
        </select>
      </label>
    </div>
  );
}
