import React from "react";
import { cn } from "@/lib/utils";

// Written by scripts/export-brand-icons.mjs from the Customer App's logo, so a logo change there reaches every
// screen that draws <BrandMark>. Vite fingerprints the file, so browsers never keep an old mark.
const MARK_URL = new URL("../../assets/brand/sugo-mark.svg", import.meta.url).href;

// Quoted: Vite inlines a small SVG as a data URI, whose spaces would end an unquoted url().
const MASK: React.CSSProperties = {
  WebkitMaskImage: `url("${MARK_URL}")`,
  maskImage: `url("${MARK_URL}")`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

interface BrandMarkProps {
  /** Size it by width (`w-5`); the height follows the mark's 3:2 shape. Colour it with a text class. */
  className?: string;
  /** Read out when set; otherwise the mark is decorative, beside a visible brand name. */
  label?: string;
}

/** The Sugo scooter mark, drawn in the current text colour like a lucide icon. */
export const BrandMark: React.FC<BrandMarkProps> = ({ className, label }) => (
  <span
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={cn("inline-block shrink-0 aspect-[3/2] bg-current", className)}
    style={MASK}
  />
);

export default BrandMark;
