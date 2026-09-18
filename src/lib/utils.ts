import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told which `text-*` utilities are font sizes.
 *
 * Tailwind's `text-` prefix is ambiguous: it sets a font size (`text-sm`) or a
 * text colour (`text-slate-500`). tailwind-merge tells them apart with a list
 * of known size names, so a project that adds its own named sizes through
 * `@theme` has to declare them here or they are classified as colours.
 *
 * The consequence of not declaring them is silent and easy to miss. The
 * dispatcher console's type scale adds `text-micro` through `text-board`, and
 * `cn("text-board", "text-board-plate")` was resolving as two competing
 * colours: tailwind-merge kept the last one and dropped `text-board`
 * altogether, so the class never reached the DOM. Every board figure rendered
 * at the inherited 16px/400 while the token itself was perfectly correct, and
 * nothing in a build, a typecheck or the design detector reports it. It was
 * only visible by reading the live element's classList.
 *
 * Declaring them also protects the reverse case, where a size would have
 * wrongly suppressed a colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["micro", "label", "body", "data", "panel", "title", "board"],
        },
      ],
      // `shadow-*` is ambiguous the same way: it sets a box shadow
      // (`shadow-sm`) or a shadow colour (`shadow-red-500`). Declared before
      // it bites, since the failure mode is a silently missing class rather
      // than an error.
      //
      // Measured rather than assumed: with only `plate` declared,
      // `cn("shadow-plate", "shadow-field")` emitted BOTH, because `field` was
      // being read as a shadow colour and colours do not conflict with box
      // shadows. Two competing box-shadow classes on one element hand the
      // decision to stylesheet order instead of to the call site.
      shadow: [{ shadow: ["plate", "field"] }],
      // And `rounded-*`. Measured on the live dialog: the shadcn primitive's
      // `rounded-2xl` and this project's `rounded-modal` both survived the
      // same cn() call, because an undeclared radius role does not conflict
      // with a known one. Two radii on one element is decided by stylesheet
      // order rather than by the call site.
      rounded: [{ rounded: ["plate", "trim", "modal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
