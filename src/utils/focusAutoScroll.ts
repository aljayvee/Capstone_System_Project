import React from "react";

export function handleInputFocusAutoScroll(e: React.FocusEvent<HTMLElement>) {
  if (typeof window === "undefined" || window.innerWidth > 768) return;

  // 250ms delay accounts for native soft keyboard slide-up animation timing
  setTimeout(() => {
    try {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // fallback
    }
  }, 250);
}

export default handleInputFocusAutoScroll;
