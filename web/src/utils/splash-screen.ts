import type { InstanceSetting_GeneralSetting_CustomProfile } from "@/types/proto/api/v1/instance_service_pb";

const SPLASH_ID = "app-splash";
const SPLASH_HIDDEN_CLASS = "app-splash-hidden";
const SPLASH_STORAGE_KEY = "memos-splash-brand";

export const dismissSplashScreen = () => {
  const splash = document.getElementById(SPLASH_ID);
  if (!splash) {
    return;
  }

  splash.classList.add(SPLASH_HIDDEN_CLASS);
  window.setTimeout(() => splash.remove(), 320);
};

export const cacheSplashBrand = (customProfile?: InstanceSetting_GeneralSetting_CustomProfile) => {
  try {
    if (!customProfile) {
      localStorage.removeItem(SPLASH_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      SPLASH_STORAGE_KEY,
      JSON.stringify({
        title: customProfile.title || "Memos",
        logoUrl: customProfile.logoUrl || "/full-logo.webp",
      }),
    );
  } catch {
    // Ignore localStorage write failures during branding cache updates.
  }
};
