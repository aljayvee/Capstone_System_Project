import { useState, useEffect } from "react";

export type DeviceTier = "compact" | "standard" | "phablet" | "desktop";

export interface DeviceInfo {
  tier: DeviceTier;
  width: number;
  height: number;
  isMobile: boolean;
  isPhone: boolean;
  isCompact: boolean;
  isLandscape: boolean;
  isShallowLandscape: boolean;
  supportsBlur: boolean;
}

const getTier = (w: number): DeviceTier => {
  if (w < 360) return "compact";
  if (w <= 414) return "standard";
  if (w <= 600) return "phablet";
  return "desktop";
};

export function useDeviceTier(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === "undefined") {
      return {
        tier: "desktop",
        width: 1280,
        height: 800,
        isMobile: false,
        isPhone: false,
        isCompact: false,
        isLandscape: false,
        isShallowLandscape: false,
        supportsBlur: true,
      };
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const tier = getTier(w);
    const navAny = typeof navigator !== "undefined" ? (navigator as any) : null;
    const memory = navAny?.deviceMemory ? navAny.deviceMemory >= 4 : true;

    return {
      tier,
      width: w,
      height: h,
      isMobile: w < 768,
      isPhone: w <= 600,
      isCompact: w < 360,
      isLandscape: w > h,
      isShallowLandscape: w > h && h < 450,
      supportsBlur: memory,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const tier = getTier(w);
      const navAny = typeof navigator !== "undefined" ? (navigator as any) : null;
      const memory = navAny?.deviceMemory ? navAny.deviceMemory >= 4 : true;

      setDeviceInfo({
        tier,
        width: w,
        height: h,
        isMobile: w < 768,
        isPhone: w <= 600,
        isCompact: w < 360,
        isLandscape: w > h,
        isShallowLandscape: w > h && h < 450,
        supportsBlur: memory,
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return deviceInfo;
}

export default useDeviceTier;
