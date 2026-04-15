import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  ZoomIn,
} from "react-native-reanimated";

export const motion = {
  hero: (delay = 0) => ZoomIn.duration(520).delay(delay),
  section: (delay = 0) => FadeInUp.duration(460).delay(delay),
  item: (delay = 0) => FadeInDown.duration(420).delay(delay),
  softFade: (delay = 0) => FadeIn.duration(320).delay(delay),
  layout: LinearTransition.springify().damping(18).stiffness(180),
  pressSpring: {
    damping: 18,
    mass: 0.6,
    stiffness: 240,
  },
};
