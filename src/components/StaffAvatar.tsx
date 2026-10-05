import React, { useEffect, useState } from "react";
import { fetchStaffPhoto } from "../services/staffPhotoService";

export interface StaffAvatarProps {
  userId: number | string;
  name: string;
  size?: number;
  className?: string;
  isOnline?: boolean;
}

/**
 * Any OWNER/DISPATCHER/RIDER's avatar, photo if they've set one, initials
 * otherwise. Shared so Owner's User Management, the Dispatcher Portal, and
 * anywhere else staff are listed all agree on one rendering.
 */
export function StaffAvatar({
  userId,
  name,
  size = 40,
  className = "",
  isOnline,
}: StaffAvatarProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhotoUri(null);
    fetchStaffPhoto(userId).then((uri) => {
      if (!cancelled) setPhotoUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={`rounded-xl bg-gradient-to-br from-[#1E3A5F] to-[#162D4A] text-white font-extrabold flex items-center justify-center text-xs shadow-2xs shrink-0 overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        {photoUri ? <img src={photoUri} alt="" className="w-full h-full object-cover" /> : initials}
      </div>
      {isOnline !== undefined && (
        <span
          title={isOnline ? "Online" : "Offline"}
          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-board-plate transition-colors ${
            isOnline ? "bg-emerald-500" : "bg-slate-400"
          }`}
          aria-label={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

export default StaffAvatar;
