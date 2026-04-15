import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { changeLanguage, getDeviceLanguage, type LanguageCode } from "@/i18n";

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
}

/**
 * Initial language: mirror whatever i18n.ts resolved from the device locale.
 * Default is "en" (see getDeviceLanguage). AsyncStorage rehydration replaces
 * this if the user has picked something manually in a prior session.
 */
const initialLanguage: LanguageCode = getDeviceLanguage();

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: initialLanguage,
      setLanguage: async (code) => {
        await changeLanguage(code);
        set({ language: code });
      },
    }),
    {
      name: "language-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Whenever a persisted selection exists, apply it to i18n so the UI
        // matches the chip. Skip only when the persisted value already equals
        // i18n's current language (set synchronously during init).
        if (state?.language) {
          changeLanguage(state.language);
        }
      },
    }
  )
);
