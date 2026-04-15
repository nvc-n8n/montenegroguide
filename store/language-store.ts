import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { changeLanguage, type LanguageCode } from "@/i18n";

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "me",
      setLanguage: async (code) => {
        await changeLanguage(code);
        set({ language: code });
      },
    }),
    {
      name: "language-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language && state.language !== "me") {
          changeLanguage(state.language);
        }
      },
    }
  )
);
