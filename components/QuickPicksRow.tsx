import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { usePressScale } from "@/hooks/usePressScale";
import { QUICK_FILTERS, type QuickFilterId } from "@/constants/filters";
import { colors, radius, shadows, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface QuickPicksRowProps {
  onPress: (filterId: QuickFilterId) => void;
  /** Which filters to surface on the home screen (a curated subset). */
  featuredIds?: QuickFilterId[];
}

const DEFAULT_FEATURED_IDS: QuickFilterId[] = [
  "family",
  "romantic",
  "hidden",
  "nightlife",
  "sandy",
  "culture",
  "active-holiday",
  "beach-club",
];

const CHIP_PALETTES: Record<QuickFilterId, { bg: string; text: string; icon: string }> = {
  family: { bg: "#fce4ec", text: "#c62828", icon: "#c62828" },
  romantic: { bg: "#fff0f3", text: "#e00b41", icon: "#e00b41" },
  hidden: { bg: "#e0f2f1", text: "#00695c", icon: "#00695c" },
  nightlife: { bg: "#f3e8f9", text: "#7b2d8e", icon: "#7b2d8e" },
  sandy: { bg: "#fff3e0", text: "#c67100", icon: "#c67100" },
  rocky: { bg: "#f5ebe0", text: "#8b5e34", icon: "#8b5e34" },
  culture: { bg: "#ede7f6", text: "#5e35b1", icon: "#5e35b1" },
  "active-holiday": { bg: "#e8f5e9", text: "#2e7d32", icon: "#2e7d32" },
  "free-access": { bg: "#e3f2fd", text: "#1565c0", icon: "#1565c0" },
  "beach-club": { bg: "#e0f4f4", text: "#008489", icon: "#008489" },
  "parking-nearby": { bg: "#f7f7f7", text: "#484848", icon: "#484848" },
};

const Pick = ({
  filterId,
  label,
  icon,
  onPress,
  index,
}: {
  filterId: QuickFilterId;
  label: string;
  icon: string;
  onPress: () => void;
  index: number;
}) => {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.955);
  const palette = CHIP_PALETTES[filterId];

  return (
    <Animated.View entering={motion.item(index * 40)}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => onPressIn()}
        onPressOut={() => onPressOut()}
        style={[
          styles.chip,
          { backgroundColor: palette.bg },
          animatedStyle,
        ]}
      >
        <MaterialCommunityIcons color={palette.icon} name={icon as never} size={18} />
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const QuickPicksRow = ({ onPress, featuredIds = DEFAULT_FEATURED_IDS }: QuickPicksRowProps) => {
  const { t } = useTranslation();
  const filters = QUICK_FILTERS.filter((filter) => featuredIds.includes(filter.id));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {filters.map((filter, index) => (
        <Pick
          key={filter.id}
          filterId={filter.id}
          label={t(filter.labelKey, { defaultValue: filter.label })}
          icon={filter.icon}
          onPress={() => onPress(filter.id)}
          index={index}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingBottom: 4,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  chip: {
    alignItems: "center",
    borderRadius: radius.pill ?? 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadows.soft,
  },
  label: {
    fontFamily: typography.sans.semiBold,
    fontSize: 13,
  },
});
