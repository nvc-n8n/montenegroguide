import { ScrollView, Pressable, StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";

import { usePressScale } from "@/hooks/usePressScale";
import type { Municipality } from "@/types/domain";
import { colors, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MunicipalitySwitcherProps {
  municipalities: Municipality[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
}

const MunicipalityChip = ({
  municipality,
  selected,
  onSelect,
  index,
}: {
  municipality: Municipality;
  selected: boolean;
  onSelect: (slug: string) => void;
  index: number;
}) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(selected ? 0.985 : 0.975);

  return (
    <Animated.View entering={motion.item(index * 45)} layout={motion.layout}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onSelect(municipality.slug)}
        onPressIn={() => onPressIn()}
        onPressOut={() => onPressOut()}
        style={[
          styles.chip,
          animatedStyle,
          selected ? { backgroundColor: colors.text, borderColor: colors.text } : null,
        ]}
      >
        <Text style={[styles.label, selected ? styles.selectedLabel : null]}>
          {municipality.name}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const MunicipalitySwitcher = ({
  municipalities,
  selectedSlug,
  onSelect,
}: MunicipalitySwitcherProps) => (
  <ScrollView contentContainerStyle={styles.container} horizontal showsHorizontalScrollIndicator={false}>
    {municipalities.map((municipality, index) => (
      <MunicipalityChip
        key={municipality.slug}
        index={index}
        municipality={municipality}
        onSelect={onSelect}
        selected={municipality.slug === selectedSlug}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  label: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  selectedLabel: {
    color: colors.card,
  },
});
