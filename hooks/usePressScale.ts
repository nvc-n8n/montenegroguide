import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { motion } from "@/utils/motion";

export const usePressScale = (pressedScale = 0.985) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(pressedScale, motion.pressSpring);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, motion.pressSpring);
  };

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
};
