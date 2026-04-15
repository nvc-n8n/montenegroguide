import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const EmptyState = ({ title, description, icon = "compass-off-outline" }: EmptyStateProps) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <MaterialCommunityIcons color={colors.textSoft} name={icon} size={26} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 16,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
