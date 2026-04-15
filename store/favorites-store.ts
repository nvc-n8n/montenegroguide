import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { Place } from "@/types/domain";

const FAVORITES_STORAGE_KEY = "montenegro-guide-favorites";

interface FavoritesState {
  favorites: Record<string, Place>;
  hydrated: boolean;
  hydrateFavorites: () => Promise<void>;
  toggleFavorite: (place: Place) => Promise<void>;
  removeFavorite: (slug: string) => Promise<void>;
  isFavorite: (slug: string) => boolean;
}

const persistFavorites = async (favorites: Record<string, Place>) => {
  await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: {},
  hydrated: false,
  hydrateFavorites: async () => {
    if (get().hydrated) {
      return;
    }

    try {
      const rawValue = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      const favorites = rawValue ? (JSON.parse(rawValue) as Record<string, Place>) : {};

      set({
        favorites,
        hydrated: true,
      });
    } catch {
      set({
        favorites: {},
        hydrated: true,
      });
    }
  },
  toggleFavorite: async (place) => {
    const currentFavorites = get().favorites;
    const nextFavorites = { ...currentFavorites };

    if (nextFavorites[place.slug]) {
      delete nextFavorites[place.slug];
    } else {
      nextFavorites[place.slug] = place;
    }

    set({
      favorites: nextFavorites,
    });

    await persistFavorites(nextFavorites);
  },
  removeFavorite: async (slug) => {
    const nextFavorites = { ...get().favorites };
    delete nextFavorites[slug];

    set({
      favorites: nextFavorites,
    });

    await persistFavorites(nextFavorites);
  },
  isFavorite: (slug) => Boolean(get().favorites[slug]),
}));
