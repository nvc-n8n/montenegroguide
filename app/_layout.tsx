import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Animated, Platform, StyleSheet, View } from "react-native";

import { AppProviders } from "@/components/providers/AppProviders";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { SplashLoader } from "@/components/SplashLoader";
import { useAppFonts } from "@/hooks/useAppFonts";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

type Phase = "splash" | "onboarding" | "ready";

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const [phase, setPhase] = useState<Phase>("splash");
  const appOpacity = useRef(new Animated.Value(0)).current;

  const onboardingDone = useOnboardingStore((s) => s.done);
  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const hydrateOnboarding = useOnboardingStore((s) => s.hydrate);
  const completeOnboarding = useOnboardingStore((s) => s.complete);

  useEffect(() => {
    hydrateOnboarding();
  }, [hydrateOnboarding]);

  // Hide native splash only once we're past the loading gate and our JS splash is mounted
  const readyToShow = fontsLoaded && onboardingHydrated;
  useEffect(() => {
    if (readyToShow) {
      // Small delay so the SplashLoader renders first, then hide native splash
      const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), 50);
      return () => clearTimeout(timer);
    }
  }, [readyToShow]);

  // Fade the app in whenever phase becomes "ready"
  useEffect(() => {
    if (phase === "ready") {
      Animated.timing(appOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, appOpacity]);

  const handleSplashFinish = useCallback(() => {
    if (onboardingHydrated && !onboardingDone) {
      setPhase("onboarding");
    } else {
      setPhase("ready");
    }
  }, [onboardingDone, onboardingHydrated]);

  const handleOnboardingComplete = useCallback(() => {
    completeOnboarding();
    setPhase("ready");
  }, [completeOnboarding]);

  if (!fontsLoaded || !onboardingHydrated) {
    return <View style={styles.loadingScreen} />;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />

      {/* Splash animation — plays every launch */}
      {phase === "splash" ? <SplashLoader onFinish={handleSplashFinish} /> : null}

      {/* Onboarding — first launch only */}
      {phase === "onboarding" ? <OnboardingFlow onComplete={handleOnboardingComplete} /> : null}

      {/* Main app — fades in after splash/onboarding */}
      <Animated.View style={[styles.appWrap, { opacity: appOpacity }]}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === "ios" ? "simple_push" : "fade_from_bottom",
            contentStyle: {
              backgroundColor: colors.page,
            },
            gestureEnabled: true,
          }}
        />
      </Animated.View>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.page,
  },
  appWrap: {
    flex: 1,
  },
});
