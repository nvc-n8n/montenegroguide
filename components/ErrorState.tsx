import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, typography } from "@/theme";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = ({
  title,
  description,
  onRetry,
}: ErrorStateProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons color={colors.danger} name="cloud-alert-outline" size={28} />
      <Text style={styles.title}>{title ?? t("error_title")}</Text>
      <Text style={styles.description}>{description ?? t("error_hint")}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonLabel}>{t("error_retry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

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
  button: {
    backgroundColor: colors.text,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: colors.card,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
});
