import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const ONBOARDING_KEY = "montenegro-guide-onboarding-done";

interface OnboardingState {
  done: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  done: false,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ done: value === "true", hydrated: true });
    } catch {
      set({ done: false, hydrated: true });
    }
  },
  complete: async () => {
    set({ done: true });
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  },
}));
