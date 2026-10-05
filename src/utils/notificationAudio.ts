/**
 * Web Audio Harmonic Chime & Dual-Engine Audio Player for Sugo Operations Portal
 *
 * Provides synthesized notification chimes with zero external audio assets (no MP3/WAV 404s).
 * Implements a dual-engine architecture:
 * 1. Web Audio API synthesis for rich, low-latency harmonic chimes.
 * 2. Self-contained in-memory PCM WAV Data URI fallback played via HTML5 Audio,
 *    ensuring audible chimes even when Chrome background tabs suspend AudioContext.
 * Fully compliant with browser Autoplay policies (auto-unlocks across click, pointerdown,
 * keydown, touchstart, and visibilitychange).
 */

const STORAGE_KEY_MUTED = "@sugo_notifications_muted";

export type NotificationSeverity = "critical" | "warning" | "info";
export type AudioStatus = "ready" | "blocked" | "muted";

let audioCtx: AudioContext | null = null;
let isUnlocked = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribeAudioStatus(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtxClass) {
      try {
        audioCtx = new AudioCtxClass();
      } catch (e) {
        console.warn("[notificationAudio] AudioContext creation failed:", e);
      }
    }
  }

  return audioCtx;
}

/**
 * Generates an uncompressed PCM 16-bit mono WAV Data URI in memory.
 * Completely offline, zero dependencies, zero network requests.
 */
function createWavDataUri(tones: Array<{ freq: number; duration: number }>): string {
  const sampleRate = 22050;
  const numSamples = tones.reduce((acc, t) => acc + Math.floor(sampleRate * t.duration), 0);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");

  // fmt subchunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 * 16 / 8)
  view.setUint16(32, 2, true); // BlockAlign (1 * 16 / 8)
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let byteOffset = 44;
  for (const tone of tones) {
    const toneSamples = Math.floor(sampleRate * tone.duration);
    for (let i = 0; i < toneSamples; i++) {
      const t = i / sampleRate;
      let envelope = 1;
      const attack = 0.04 * tone.duration;
      const decay = 0.45 * tone.duration;
      if (t < attack) {
        envelope = t / attack;
      } else if (t > tone.duration - decay) {
        envelope = Math.max(0, (tone.duration - t) / decay);
      }
      envelope = Math.max(0, Math.min(1, envelope));

      const sample = Math.sin(2 * Math.PI * tone.freq * t) * envelope * 0.35;
      const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      if (byteOffset + 2 <= buffer.byteLength) {
        view.setInt16(byteOffset, int16, true);
        byteOffset += 2;
      }
    }
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

// Cached WAV Data URIs
let cachedInfoWavUri: string | null = null;
let cachedCriticalWavUri: string | null = null;

function getWavDataUri(severity: NotificationSeverity): string {
  if (severity === "critical") {
    if (!cachedCriticalWavUri) {
      cachedCriticalWavUri = createWavDataUri([
        { freq: 880, duration: 0.12 },
        { freq: 0, duration: 0.03 },
        { freq: 660, duration: 0.18 },
      ]);
    }
    return cachedCriticalWavUri;
  }

  // Warning & Info share a bright two-tone ascending chime (C5 -> E5)
  if (!cachedInfoWavUri) {
    cachedInfoWavUri = createWavDataUri([
      { freq: 523.25, duration: 0.14 },
      { freq: 659.25, duration: 0.22 },
    ]);
  }
  return cachedInfoWavUri;
}

function playHtml5AudioChime(severity: NotificationSeverity): void {
  if (typeof window === "undefined") return;
  try {
    const dataUri = getWavDataUri(severity);
    const audio = new Audio(dataUri);
    audio.volume = severity === "critical" ? 0.75 : 0.6;
    audio.play().catch((err) => {
      console.warn("[notificationAudio] HTML5 Audio fallback play blocked:", err);
    });
  } catch (err) {
    console.warn("[notificationAudio] HTML5 Audio fallback failed:", err);
  }
}

/**
 * Check if notifications are currently muted.
 */
export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_MUTED) === "true";
  } catch {
    return false;
  }
}

/**
 * Set notification sound mute status and persist to localStorage.
 */
export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MUTED, muted ? "true" : "false");
    notifyListeners();
  } catch {
    // Storage access failures handled safely
  }
}

/**
 * Check if the browser audio engine is unlocked and ready to play.
 */
export function isAudioUnlocked(): boolean {
  if (isUnlocked) return true;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "running") {
    isUnlocked = true;
    return true;
  }
  return false;
}

/**
 * Current audio engine status.
 */
export function getAudioStatus(): AudioStatus {
  if (isNotificationSoundMuted()) return "muted";
  if (isAudioUnlocked()) return "ready";
  return "blocked";
}

/**
 * Explicit user gesture trigger to unlock the AudioContext and prime HTML5 Audio.
 */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === "suspended") {
        await Promise.race([
          ctx.resume(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("unlock timeout")), 300)),
        ]).catch(() => {});
      }
      if (ctx.state === "running") {
        isUnlocked = true;
      }
    } catch (e) {
      console.warn("[notificationAudio] AudioContext unlock error:", e);
    }
  }

  // Pre-prime HTML5 Audio element
  try {
    const dummyAudio = new Audio(getWavDataUri("info"));
    dummyAudio.volume = 0;
    const playPromise = dummyAudio.play();
    if (playPromise) {
      await playPromise
        .then(() => {
          dummyAudio.pause();
          dummyAudio.currentTime = 0;
          isUnlocked = true;
        })
        .catch(() => {});
    }
  } catch {}

  notifyListeners();
  return isUnlocked;
}

/**
 * Attaches multi-event gesture listeners to unlock AudioContext across modern browsers.
 */
function initAutoplayUnlock() {
  if (typeof window === "undefined") return;

  const removeListeners = () => {
    window.removeEventListener("pointerdown", unlockHandler);
    window.removeEventListener("keydown", unlockHandler);
    window.removeEventListener("click", unlockHandler);
    window.removeEventListener("touchstart", unlockHandler);
  };

  const unlockHandler = async () => {
    removeListeners();
    const unlocked = await unlockAudio();
    if (!unlocked) {
      // Re-attach once if initial gesture didn't satisfy browser autoplay policy
      window.addEventListener("pointerdown", unlockHandler, { passive: true, once: true });
      window.addEventListener("keydown", unlockHandler, { passive: true, once: true });
      window.addEventListener("click", unlockHandler, { passive: true, once: true });
      window.addEventListener("touchstart", unlockHandler, { passive: true, once: true });
    }
  };

  window.addEventListener("pointerdown", unlockHandler, { passive: true, once: true });
  window.addEventListener("keydown", unlockHandler, { passive: true, once: true });
  window.addEventListener("click", unlockHandler, { passive: true, once: true });
  window.addEventListener("touchstart", unlockHandler, { passive: true, once: true });

  // Handle Chrome tab backgrounding / foregrounding
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => {
            isUnlocked = true;
            notifyListeners();
          })
          .catch(() => {});
      }
    }
  });
}

if (typeof window !== "undefined") {
  initAutoplayUnlock();
}

/**
 * Plays a synthesized harmonic chime based on severity level.
 * Handles async AudioContext resumption and falls back seamlessly to HTML5 Audio.
 */
export async function playNotificationChime(severity: NotificationSeverity = "info"): Promise<void> {
  if (isNotificationSoundMuted()) return;

  // Background tab protection:
  // When a tab is in the background (document.hidden === true), Chrome suspends
  // AudioContext and keeps ctx.resume() pending indefinitely until foregrounded.
  // Therefore, in background tabs, immediately play via HTML5 Audio without blocking.
  if (typeof document !== "undefined" && document.hidden) {
    playHtml5AudioChime(severity);
    return;
  }

  const ctx = getAudioContext();
  let playedWebAudio = false;

  if (ctx) {
    if (ctx.state === "suspended") {
      try {
        await Promise.race([
          ctx.resume(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("resume timeout")), 250)),
        ]);
      } catch {
        // Resume failed or timed out (Chrome autoplay policy or background tab)
      }
    }

    if (ctx.state === "running") {
      try {
        isUnlocked = true;
        const now = ctx.currentTime;

        if (severity === "critical") {
          // Critical alert: Two sharp sine pulses (880Hz A5 -> 660Hz E5)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(880, now);
          osc1.frequency.exponentialRampToValueAtTime(800, now + 0.12);

          gain1.gain.setValueAtTime(0.28, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc1.connect(gain1);
          gain1.connect(ctx.destination);

          osc1.start(now);
          osc1.stop(now + 0.12);

          // Second tone
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(660, now + 0.14);
          osc2.frequency.exponentialRampToValueAtTime(580, now + 0.32);

          gain2.gain.setValueAtTime(0.32, now + 0.14);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          osc2.start(now + 0.14);
          osc2.stop(now + 0.32);
        } else {
          // Standard / Warning: Pleasant harmonic two-tone chime (523.25Hz C5 -> 659.25Hz E5)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();

          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(523.25, now);

          gain1.gain.setValueAtTime(0.22, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

          osc1.connect(gain1);
          gain1.connect(ctx.destination);

          osc1.start(now);
          osc1.stop(now + 0.18);

          // Second ascending harmonic tone
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          osc2.type = "sine";
          osc2.frequency.setValueAtTime(659.25, now + 0.12);

          gain2.gain.setValueAtTime(0.25, now + 0.12);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          osc2.start(now + 0.12);
          osc2.stop(now + 0.38);
        }
        playedWebAudio = true;
      } catch (err) {
        console.warn("[notificationAudio] Web Audio API playback error:", err);
      }
    }
  }

  // Fallback to HTML5 Audio if Web Audio was suspended or failed
  if (!playedWebAudio) {
    playHtml5AudioChime(severity);
  }
}

