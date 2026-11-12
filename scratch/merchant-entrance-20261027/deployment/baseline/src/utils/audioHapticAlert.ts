let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// First-touch audio unlock listener
export function initAudioUnlock(): void {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlock = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      isAudioUnlocked = true;
    } catch {
      // ignore
    }

    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };

  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
}

export type AlertType = "order" | "notification" | "error" | "success";

export function playAlertHaptic(type: AlertType = "notification"): void {
  // 1. Haptic Vibration
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      switch (type) {
        case "order":
          navigator.vibrate([200, 100, 200]);
          break;
        case "error":
          navigator.vibrate([150, 80, 150, 80]);
          break;
        case "success":
          navigator.vibrate(50);
          break;
        case "notification":
        default:
          navigator.vibrate(80);
          break;
      }
    } catch {
      // ignore
    }
  }

  // 2. Synthesized Web Audio Chime
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "order") {
      // High-priority two-tone dispatch chime (587 Hz -> 880 Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "error") {
      // Subtle alert low pitch (300 Hz)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Soft high confirmation tone (659 Hz -> 784 Hz)
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch {
    // audio context blocked
  }
}

export default playAlertHaptic;
