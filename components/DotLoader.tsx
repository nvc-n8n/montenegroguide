import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View, ViewStyle } from "react-native";

import { colors } from "@/theme";

const DOT_COLORS = [colors.accent, colors.sea, "#c79542"];
const DOT_SIZE = 10;
const BOUNCE_HEIGHT = 8;

interface DotLoaderProps {
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}

/* ──────── Web: pure CSS keyframes (no JS thread cost) ──────── */

const WEB_KEYFRAMES = `
@keyframes dotBounce {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
  50%      { transform: translateY(-8px) scale(1.3); opacity: 1; }
}`;

let styleInjected = false;
const injectWebStyles = () => {
  if (styleInjected || Platform.OS !== "web") return;
  styleInjected = true;
  const tag = document.createElement("style");
  tag.textContent = WEB_KEYFRAMES;
  document.head.appendChild(tag);
};

const WebDotLoader = ({ size = "md", style }: DotLoaderProps) => {
  const dotSize = size === "sm" ? 6 : size === "lg" ? 14 : DOT_SIZE;

  useEffect(() => { injectWebStyles(); }, []);

  return (
    <View style={[styles.container, style]}>
      {DOT_COLORS.map((color, i) => (
        <View
          key={i}
          // @ts-expect-error — RNW supports web style properties
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            animationName: "dotBounce",
            animationDuration: "0.6s",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.14}s`,
            animationTimingFunction: "ease-in-out",
          }}
        />
      ))}
    </View>
  );
};

/* ──────── Native: Animated API with useNativeDriver ──────── */

const NativeDotLoader = ({ size = "md", style }: DotLoaderProps) => {
  const scales = DOT_COLORS.map(() => useRef(new Animated.Value(0)).current);

  const dotSize = size === "sm" ? 6 : size === "lg" ? 14 : DOT_SIZE;
  const bounce = size === "sm" ? 5 : size === "lg" ? 12 : BOUNCE_HEIGHT;

  useEffect(() => {
    const animations = scales.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      )
    );

    const composite = Animated.parallel(animations);
    composite.start();
    return () => composite.stop();
  }, [scales]);

  return (
    <View style={[styles.container, style]}>
      {scales.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: DOT_COLORS[i],
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -bounce],
                }),
              },
              {
                scale: anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.3, 1],
                }),
              },
            ],
            opacity: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1, 0.5],
            }),
          }}
        />
      ))}
    </View>
  );
};

/* ──────── Export ──────── */

export const DotLoader = Platform.OS === "web" ? WebDotLoader : NativeDotLoader;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
});
