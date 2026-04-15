import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { PropsWithChildren, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import "@/i18n";
import { useFavoritesStore } from "@/store/favorites-store";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const AppProviders = ({ children }: PropsWithChildren) => {
  const hydrateFavorites = useFavoritesStore((state) => state.hydrateFavorites);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.page).catch(() => undefined);
  }, []);

  useEffect(() => {
    hydrateFavorites().catch(() => undefined);
  }, [hydrateFavorites]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
