import React, { useEffect, useRef, useState } from "react";
import { KuyaSugoCharacter, type KuyaSugoAction } from "./KuyaSugoCharacter";

const LINES = ["On my way.", "Ay!", "Oops...", "One sec, Boss.", "All good, Boss."];

export function KuyaSugoScene({ action, paused }: { action: KuyaSugoAction; paused: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const playful = action === "wave" || action === "ready";

  useEffect(() => {
    const updateVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 }
    );
    if (sceneRef.current) observer?.observe(sceneRef.current);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", updateVisibility); };
  }, []);

  const label = playful ? "Kuya Sugo walks, trips, drops his box, then picks it up with a smile."
    : action === "listen" ? "Kuya Sugo is listening." : "Kuya Sugo is checking your question.";

  return <div ref={sceneRef} className="kuya-scene" data-playful={playful}
    data-paused={paused || !inView || !tabVisible} role="img" aria-label={label}>
    <div className="kuya-scene__bubble" aria-hidden="true">
      {playful ? <>
        <span className="kuya-scene__dialogue">{LINES.map((line, index) => <span key={line} data-line={index}>{line}</span>)}</span>
        <span className="kuya-scene__still">Ready, Boss!</span>
      </> : <span>{action === "listen" ? "I'm listening!" : "On it, Boss!"}</span>}
    </div>
    <KuyaSugoCharacter action={action} paused={paused || !inView || !tabVisible} />
  </div>;
}
