import React, { createContext, useContext, useState, useEffect } from "react";
import {
  SysAdminLanguage,
  SysAdminTranslations,
  SYSADMIN_TRANSLATIONS,
} from "../i18n/sysAdminI18n";

interface SysAdminLanguageContextType {
  language: SysAdminLanguage;
  setLanguage: (lang: SysAdminLanguage) => void;
  t: (key: keyof SysAdminTranslations) => string;
}

const STORAGE_KEY = "sugo_sysadmin_lang";

const SysAdminLanguageContext = createContext<SysAdminLanguageContextType | undefined>(
  undefined
);

export const SysAdminLanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Default to Mandarin Chinese ("zh")
  const [language, setLanguageState] = useState<SysAdminLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh") {
        return stored;
      }
    } catch {
      // ignore
    }
    return "zh"; // Mandarin Chinese by default
  });

  const setLanguage = (lang: SysAdminLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const t = (key: keyof SysAdminTranslations): string => {
    const currentDict = SYSADMIN_TRANSLATIONS[language] || SYSADMIN_TRANSLATIONS.zh;
    return currentDict[key] || SYSADMIN_TRANSLATIONS.zh[key] || key;
  };

  return (
    <SysAdminLanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </SysAdminLanguageContext.Provider>
  );
};

export const useSysAdminLanguage = (): SysAdminLanguageContextType => {
  const ctx = useContext(SysAdminLanguageContext);
  if (!ctx) {
    // Fallback if accessed outside provider
    const fallbackT = (key: keyof SysAdminTranslations) =>
      SYSADMIN_TRANSLATIONS.zh[key] || key;
    return {
      language: "zh",
      setLanguage: () => {},
      t: fallbackT,
    };
  }
  return ctx;
};
