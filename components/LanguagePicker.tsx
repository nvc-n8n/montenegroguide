import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";
import { useLanguageStore } from "@/store/language-store";
import { colors, spacing, typography } from "@/theme";

export const LanguagePicker = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("language")}</Text>
      <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = language === lang.code;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={lang.code}
              onPress={() => setLanguage(lang.code as LanguageCode)}
              style={[styles.chip, selected ? styles.chipSelected : null]}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {lang.flag} {lang.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  chipLabelSelected: {
    color: colors.card,
  },
});
