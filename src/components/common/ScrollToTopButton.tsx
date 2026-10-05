import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  scrollThreshold?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  scrollThreshold = 400,
  containerRef,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = containerRef?.current || (typeof window !== "undefined" ? window : null);
    if (!target) return;

    const handleScroll = () => {
      const scrollY =
        containerRef?.current !== undefined && containerRef?.current !== null
          ? containerRef.current.scrollTop
          : window.scrollY;

      setIsVisible(scrollY > scrollThreshold);
    };

    target.addEventListener("scroll", handleScroll as EventListener, { passive: true });
    return () => {
      target.removeEventListener("scroll", handleScroll as EventListener);
    };
  }, [scrollThreshold, containerRef]);

  const scrollToTop = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }

    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top of page"
      className="fixed bottom-20 right-4 z-30 w-11 h-11 rounded-full bg-[#0F1A30] hover:bg-slate-800 border border-slate-700/80 text-slate-200 shadow-xl flex items-center justify-center active-press cursor-pointer transition-all animate-fade-in"
    >
      <ArrowUp className="w-5 h-5 text-red-500" />
    </button>
  );
};

export default ScrollToTopButton;
