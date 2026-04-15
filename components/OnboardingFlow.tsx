import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/theme";

const ACCENT_COLORS = [colors.accent, colors.sea, "#c79542"];

interface OnboardingStep {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  blobColor: string;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: "compass-outline",
    iconColor: colors.accent,
    blobColor: colors.accent,
    title: "Discover the coast",
    body: "Six coastal cities — from Herceg Novi to Ulcinj. Browse beaches, fortresses, hidden gems, and restaurants all in one place.",
  },
  {
    icon: "heart-outline",
    iconColor: colors.sea,
    blobColor: colors.sea,
    title: "Save what matters",
    body: "Tap the heart on any place to save it. Build your personal shortlist and access it offline — no account needed.",
  },
  {
    icon: "map-marker-radius-outline",
    iconColor: "#c79542",
    blobColor: "#c79542",
    title: "Go explore",
    body: "Get directions, filter by category and tags, and find the perfect spot for today — whether it's a quiet beach or a lively evening out.",
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

/* ──────── Web: CSS transitions (GPU-composited) ──────── */

const ONBOARDING_CSS = `
@keyframes obSlideIn {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes obSlideOut {
  from { transform: translateY(0);    opacity: 1; }
  to   { transform: translateY(-20px); opacity: 0; }
}
@keyframes obFadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.ob-step-enter { animation: obSlideIn 0.4s cubic-bezier(0.33,1,0.68,1) forwards; }
.ob-step-exit  { animation: obSlideOut 0.2s ease forwards; }
.ob-exit       { animation: obFadeOut 0.3s ease forwards; }
`;

let obStyleInjected = false;
const injectOBStyles = () => {
  if (obStyleInjected || Platform.OS !== "web") return;
  obStyleInjected = true;
  const tag = document.createElement("style");
  tag.textContent = ONBOARDING_CSS;
  document.head.appendChild(tag);
};

const WebOnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(0);
  const [animClass, setAnimClass] = useState("ob-step-enter");
  const containerRef = useRef<View>(null);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => { injectOBStyles(); }, []);

  const handleNext = () => {
    setAnimClass("ob-step-exit");
    setTimeout(() => {
      if (isLast) {
        const el = containerRef.current as unknown as HTMLElement;
        if (el) el.className += " ob-exit";
        setTimeout(onComplete, 300);
      } else {
        setStep((s) => s + 1);
        setAnimClass("ob-step-enter");
      }
    }, 200);
  };

  return (
    // @ts-expect-error — ref works on RNW
    <View ref={containerRef} style={styles.container}>
      <View style={[styles.blobBg, { backgroundColor: current.blobColor }]} />
      <View style={[styles.blobBg2, { backgroundColor: current.blobColor }]} />

      <View style={styles.stepIndicator}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, i === step ? styles.stepDotActive : null]} />
        ))}
      </View>

      <View
        key={step}
        // @ts-expect-error — RNW supports className
        className={animClass}
        style={styles.content}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${current.blobColor}15`,
              borderColor: `${current.blobColor}30`,
            },
          ]}
        >
          <MaterialCommunityIcons color={current.iconColor} name={current.icon} size={48} />
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={handleNext} style={[styles.button, isLast ? styles.buttonPrimary : null]}>
          <Text style={[styles.buttonLabel, isLast ? styles.buttonLabelPrimary : null]}>
            {isLast ? "Let's go" : "Next"}
          </Text>
          <MaterialCommunityIcons
            color={isLast ? colors.card : colors.text}
            name={isLast ? "arrow-right" : "chevron-right"}
            size={20}
          />
        </Pressable>
        {!isLast ? (
          <Pressable onPress={onComplete} style={styles.skipButton}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

/* ──────── Native: Animated API ──────── */

const NativeOnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState(0);
  const fadeSlide = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const contentOpacity = fadeSlide;
  const slideY = fadeSlide.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const iconScale = fadeSlide;

  const animateEntrance = () => {
    fadeSlide.setValue(0);
    Animated.timing(fadeSlide, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    Animated.timing(fadeSlide, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isLast) {
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onComplete());
      } else {
        setStep((s) => s + 1);
        animateEntrance();
      }
    });
  };

  useEffect(() => { animateEntrance(); }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <View style={[styles.blobBg, { backgroundColor: current.blobColor }]} />
      <View style={[styles.blobBg2, { backgroundColor: current.blobColor }]} />

      <View style={styles.stepIndicator}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.stepDot, i === step ? styles.stepDotActive : null]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: slideY }] }]}>
        <Animated.View
          style={[
            styles.iconCircle,
            {
              backgroundColor: `${current.blobColor}15`,
              borderColor: `${current.blobColor}30`,
              transform: [{ scale: iconScale }],
            },
          ]}
        >
          <MaterialCommunityIcons color={current.iconColor} name={current.icon} size={48} />
        </Animated.View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <Pressable onPress={handleNext} style={[styles.button, isLast ? styles.buttonPrimary : null]}>
          <Text style={[styles.buttonLabel, isLast ? styles.buttonLabelPrimary : null]}>
            {isLast ? "Let's go" : "Next"}
          </Text>
          <MaterialCommunityIcons
            color={isLast ? colors.card : colors.text}
            name={isLast ? "arrow-right" : "chevron-right"}
            size={20}
          />
        </Pressable>
        {!isLast ? (
          <Pressable onPress={onComplete} style={styles.skipButton}>
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

/* ──────── Export ──────── */

export const OnboardingFlow = Platform.OS === "web" ? WebOnboardingFlow : NativeOnboardingFlow;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: colors.page,
    justifyContent: "center",
    paddingHorizontal: 40,
    zIndex: 100,
  },
  blobBg: {
    borderRadius: 200,
    height: 320,
    left: -60,
    opacity: 0.06,
    position: "absolute",
    top: "15%",
    width: 320,
  },
  blobBg2: {
    borderRadius: 160,
    height: 240,
    opacity: 0.04,
    position: "absolute",
    right: -40,
    top: "55%",
    width: 240,
  },
  stepIndicator: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    top: 80,
  },
  stepDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  stepDotActive: {
    backgroundColor: colors.text,
    width: 24,
  },
  content: {
    alignItems: "center",
    gap: 20,
    maxWidth: 340,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 100,
    justifyContent: "center",
    marginBottom: 8,
    width: 100,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
  },
  bottom: {
    alignItems: "center",
    bottom: 80,
    gap: 16,
    left: 40,
    position: "absolute",
    right: 40,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16,
    width: "100%",
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 16,
  },
  buttonLabelPrimary: {
    color: colors.card,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipLabel: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
});
