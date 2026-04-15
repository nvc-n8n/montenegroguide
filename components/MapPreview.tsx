import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, typography } from "@/theme";
import type { Place } from "@/types/domain";
import { formatCoordinates } from "@/utils/format";

interface MapPreviewProps {
  place: Place;
  onOpenRoute: () => void;
}

export const MapPreview = ({ place, onOpenRoute }: MapPreviewProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={colors.text} name="map-marker-path" size={22} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t("place_map_title")}</Text>
          <Text style={styles.subtitle}>{formatCoordinates(place)}</Text>
        </View>
      </View>

      <View style={styles.mapMock}>
        <MaterialCommunityIcons color={colors.textSoft} name="waves-arrow-right" size={32} />
        <Text style={styles.mapText}>{t("place_map_hint")}</Text>
      </View>

      <Pressable onPress={onOpenRoute} style={styles.button}>
        <MaterialCommunityIcons color={colors.card} name="navigation-variant-outline" size={18} />
        <Text style={styles.buttonLabel}>{t("place_open_route")}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 16,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 13,
  },
  mapMock: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    gap: spacing.sm,
    minHeight: 140,
    justifyContent: "center",
    padding: spacing.lg,
  },
  mapText: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  buttonLabel: {
    color: colors.card,
    fontFamily: typography.sans.medium,
    fontSize: 15,
  },
});
