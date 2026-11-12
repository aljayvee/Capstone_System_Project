import React, { useEffect, useState, useCallback } from "react";
import { Volume2, Volume1, VolumeX, Check } from "lucide-react";
import {
  getAudioStatus,
  subscribeAudioStatus,
  unlockAudio,
  playNotificationChime,
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  type AudioStatus,
} from "../utils/notificationAudio";

export const HeaderAudioStatus: React.FC = () => {
  const [status, setStatus] = useState<AudioStatus>(() => getAudioStatus());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const unsub = subscribeAudioStatus(() => {
      setStatus(getAudioStatus());
    });
    // Check initial state
    setStatus(getAudioStatus());
    return unsub;
  }, []);

  const handleClick = useCallback(async () => {
    // If browser supports desktop notifications, request permission on user gesture
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      try {
        await Notification.requestPermission();
      } catch {
        // Handled silently
      }
    }

    if (isNotificationSoundMuted()) {
      setNotificationSoundMuted(false);
    }

    await unlockAudio();
    await playNotificationChime("info");

    setIsPlayingTest(true);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 1200);
  }, []);

  const getTooltip = () => {
    if (status === "muted") {
      return "Notification sounds muted · Click to unmute and test chime";
    }
    if (status === "blocked") {
      return "Sound paused by browser autoplay · Click to test & enable chime";
    }
    return "Notification chime active · Click to play sound test";
  };

  return (
    <button
      type="button"
      data-audio-status
      onClick={handleClick}
      aria-label={getTooltip()}
      title={getTooltip()}
      className="relative grid size-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      {isPlayingTest ? (
        <Check size={16} className="text-emerald-500 transition-transform scale-110" />
      ) : status === "muted" ? (
        <VolumeX size={16} className="text-slate-400" />
      ) : status === "blocked" ? (
        <>
          <Volume1 size={16} className="text-amber-500" />
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
          />
        </>
      ) : (
        <Volume2 size={16} className="text-slate-600" />
      )}
    </button>
  );
};
