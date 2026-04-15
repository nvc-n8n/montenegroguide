import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/EmptyState";
import { FilterChipRow } from "@/components/FilterChipRow";
import { PlaceCard } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useFavoritesStore } from "@/store/favorites-store";
import { colors, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

export const FavoritesScreen = () => {
  const { t } = useTranslation();
  // Subscribe to the stable record reference, derive the list locally.
  // Returning Object.values() directly from a Zustand v5 selector creates a
  // fresh array on every call which triggers an infinite re-render loop.
  const favoritesMap = useFavoritesStore((state) => state.favorites);
  const favorites = useMemo(() => Object.values(favoritesMap), [favoritesMap]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>();

  const municipalityOptions = useMemo(
    () =>
      Array.from(
        new Map(favorites.map((place) => [place.municipalitySlug, place.municipalityName])).entries()
      ).map(([id, label]) => ({
        id,
        label,
      })),
    [favorites]
  );

  const filteredFavorites = useMemo(
    () =>
      selectedMunicipality
        ? favorites.filter((place) => place.municipalitySlug === selectedMunicipality)
        : favorites,
    [favorites, selectedMunicipality]
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Animated.View entering={motion.section(20)} style={styles.header}>
          <Text style={styles.eyebrow}>{t("favorites_eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t("favorites_title")}</Text>
          <Text style={styles.subtitle}>
            {t("favorites_subtitle")}
          </Text>
        </Animated.View>

        {municipalityOptions.length ? (
          <Animated.View entering={motion.section(80)}>
            <FilterChipRow
              onToggle={(municipalitySlug) =>
                setSelectedMunicipality((current) => (current === municipalitySlug ? undefined : municipalitySlug))
              }
              options={municipalityOptions}
              selectedIds={selectedMunicipality ? [selectedMunicipality] : []}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={motion.section(130)} style={styles.section}>
          <SectionHeader title={t("favorites_list_title")} subtitle={t("favorites_list_count", { count: filteredFavorites.length })} />
          {!filteredFavorites.length ? (
            <EmptyState
              description={t("favorites_empty_hint")}
              icon="heart-outline"
              title={t("favorites_empty_title")}
            />
          ) : (
            <Animated.View layout={motion.layout} style={styles.list}>
              {filteredFavorites.map((place) => (
                <PlaceCard key={place.slug} onPress={() => router.push(`/places/${place.slug}`)} place={place} variant="list" />
              ))}
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.page,
    flex: 1,
  },
  page: {
    gap: spacing.lg,
    paddingBottom: 132,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    lineHeight: 34,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 8,
  },
});
