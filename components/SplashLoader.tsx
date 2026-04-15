import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { DotLoader } from "@/components/DotLoader";
import { colors, typography } from "@/theme";

const SPLASH_COLORS = [colors.accent, colors.sea, "#c79542", "#ff385c"];

interface SplashLoaderProps {
  onFinish: () => void;
}

/* ──────── Web: CSS animations (GPU-composited, no JS jank) ──────── */

const WEB_SPLASH_CSS = `
@keyframes splashBlobIn {
  from { transform: scale(0.3); opacity: 0; }
  to   { transform: scale(1);   opacity: 0.14; }
}
@keyframes splashContentIn {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes splashFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}`;

let splashStyleInjected = false;
const injectSplashCSS = () => {
  if (splashStyleInjected || Platform.OS !== "web") return;
  splashStyleInjected = true;
  const tag = document.createElement("style");
  tag.textContent = WEB_SPLASH_CSS;
  document.head.appendChild(tag);
};

const WebSplashLoader = ({ onFinish }: SplashLoaderProps) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    injectSplashCSS();
    // Total: blobs 600ms + content 500ms + hold 700ms + fade 300ms ≈ 2.1s
    const timer = setTimeout(() => {
      // Trigger fade-out via class, then call onFinish
      const el = containerRef.current as unknown as HTMLElement;
      if (el) {
        el.style.animation = "splashFadeOut 0.3s ease forwards";
      }
      setTimeout(onFinish, 300);
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    // @ts-expect-error — ref works on RNW
    <View ref={containerRef} style={styles.container}>
      {SPLASH_COLORS.map((color, i) => (
        <View
          key={i}
          // @ts-expect-error — RNW supports web animation properties
          style={[
            styles.blob,
            blobPositions[i],
            {
              backgroundColor: color,
              animationName: "splashBlobIn",
              animationDuration: "0.6s",
              animationDelay: `${i * 0.1}s`,
              animationFillMode: "both",
              animationTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
            },
          ]}
        />
      ))}

      <View
        // @ts-expect-error — RNW supports web animation properties
        style={[
          styles.content,
          {
            animationName: "splashContentIn",
            animationDuration: "0.5s",
            animationDelay: "0.5s",
            animationFillMode: "both",
            animationTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
          },
        ]}
      >
        <Animated.Text style={styles.title}>Montenegro</Animated.Text>
        <Animated.Text style={styles.subtitle}>Coast City Guide</Animated.Text>
        <View style={styles.dotWrap}>
          <DotLoader size="lg" />
        </View>
      </View>
    </View>
  );
};

/* ──────── Native: Animated API ──────── */

const NativeSplashLoader = ({ onFinish }: SplashLoaderProps) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(700),
      Animated.timing(exitOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, [fadeIn, titleY, exitOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      {SPLASH_COLORS.map((color, i) => (
        <Animated.View
          key={i}
          style={[
            styles.blob,
            blobPositions[i],
            { backgroundColor: color, opacity: Animated.multiply(fadeIn, 0.14) },
          ]}
        />
      ))}

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: titleY }] }]}>
        <Animated.Text style={styles.title}>Montenegro</Animated.Text>
        <Animated.Text style={styles.subtitle}>Coast City Guide</Animated.Text>
        <View style={styles.dotWrap}>
          <DotLoader size="lg" />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

/* ──────── Export ──────── */

export const SplashLoader = Platform.OS === "web" ? WebSplashLoader : NativeSplashLoader;

const blobPositions = [
  { left: "10%", top: "18%", width: 260, height: 260, borderRadius: 130 },
  { right: "5%", top: "25%", width: 200, height: 200, borderRadius: 100 },
  { left: "15%", top: "55%", width: 240, height: 240, borderRadius: 120 },
  { right: "10%", top: "62%", width: 180, height: 180, borderRadius: 90 },
] as const;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.page,
    justifyContent: "center",
    zIndex: 100,
  },
  blob: {
    position: "absolute",
  },
  content: {
    alignItems: "center",
    gap: 8,
    zIndex: 1,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.bold,
    fontSize: 36,
    letterSpacing: -0.44,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sans.medium,
    fontSize: 18,
    letterSpacing: 0.4,
  },
  dotWrap: {
    marginTop: 24,
  },
});
