import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader = ({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) => (
  <View style={styles.row}>
    <View style={styles.textWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {actionLabel && onAction ? (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onAction}
        style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
        <MaterialCommunityIcons color={colors.accent} name="arrow-right" size={16} />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.bold,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingBottom: 2,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    color: colors.accent,
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
  },
});
