import { Animated, StyleSheet, ViewStyle } from "react-native";
import { useEffect, useRef } from "react";

import { colors, radius } from "@/theme";

interface SkeletonBlockProps {
  width?: ViewStyle["width"];
  height?: number;
  style?: ViewStyle;
}

export const SkeletonBlock = ({ width = "100%", height = 16, style }: SkeletonBlockProps) => {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { width, height }, { opacity }, style]} />;
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.border,
    borderRadius: radius.md,
  },
});
