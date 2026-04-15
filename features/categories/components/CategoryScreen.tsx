import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, RefreshControl, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterChipRow } from "@/components/FilterChipRow";
import { SkeletonBlock } from "@/components/LoadingSkeleton";
import { PlaceCard } from "@/components/PlaceCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SmartImage } from "@/components/SmartImage";
import { CATEGORY_COVER_FALLBACKS } from "@/constants/category-cover-fallbacks";
import { QUICK_FILTERS } from "@/constants/filters";
import { useCategoriesQuery, useInfinitePlacesQuery, useMunicipalitiesQuery } from "@/hooks/useGuideQueries";
import { colors, radius, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

export const CategoryScreen = () => {
  const { t } = useTranslation();
  const {
    slug,
    coverHighlight,
    coverImage,
    coverThumb,
    coverTitle,
  } = useLocalSearchParams<{
    slug: string;
    coverHighlight?: string;
    coverImage?: string;
    coverThumb?: string;
    coverTitle?: string;
  }>();

  const categoriesQuery = useCategoriesQuery();
  const municipalitiesQuery = useMunicipalitiesQuery();
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Some "categories" are actually boolean flags, not real category_id filters
  const FLAG_CATEGORIES: Record<string, Record<string, unknown>> = {
    "hidden-gems": { hidden_gem: true },
    "porodicna-mjesta": { family_friendly: true },
  };
  const flagFilter = slug ? FLAG_CATEGORIES[slug] : undefined;

  const placesQuery = useInfinitePlacesQuery(
    {
      ...(flagFilter ? flagFilter : { category: slug }),
      municipality: selectedMunicipality,
      tags: selectedTags,
    },
    Boolean(slug)
  );

  const category = categoriesQuery.data?.find((item) => item.slug === slug);
  const places = placesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const fallbackCover = slug ? CATEGORY_COVER_FALLBACKS[slug] : undefined;
  const liveCover = places.find((place) => place.images[0]?.url)?.images[0];
  const heroImage = coverImage ?? liveCover?.url ?? fallbackCover?.imageUrl;
  const heroThumb = coverThumb ?? liveCover?.thumbUrl;
  const heroTitle = coverTitle ?? fallbackCover?.title ?? category?.name ?? "Mjesta po temi";
  const heroHighlight =
    coverHighlight ??
    fallbackCover?.highlight ??
    "Odabrana mjesta u ovoj temi, složena da ti skrate traženje i ubrzaju odluku.";

  const onRefresh = async () => {
    await Promise.all([categoriesQuery.refetch(), municipalitiesQuery.refetch(), placesQuery.refetch()]);
  };

  if (placesQuery.isLoading && !placesQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page}>
          <SkeletonBlock height={320} style={{ borderRadius: radius.card }} />
          <SkeletonBlock height={20} width={160} />
          <SkeletonBlock height={44} style={{ borderRadius: 999 }} />
          <SkeletonBlock height={180} style={{ borderRadius: radius.card }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={placesQuery.isRefetching} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={motion.softFade(10)} style={styles.topBar}>
          <Pressable accessibilityLabel="Nazad" accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={styles.backButton}>
            <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={motion.hero(40)} style={styles.heroCard}>
          <SmartImage alt={heroTitle} style={styles.heroImage} thumbUri={heroThumb} uri={heroImage}>
            <View style={styles.heroOverlay}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillLabel}>{(flagFilter ? places.length : category?.placeCount) || places.length} mjesta</Text>
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroEyebrow}>{t("category_eyebrow")}</Text>
                <Text style={styles.heroTitle}>{heroTitle}</Text>
                <Text style={styles.heroSubtitle}>{heroHighlight}</Text>
              </View>
            </View>
          </SmartImage>
        </Animated.View>

        <Animated.View entering={motion.section(110)} style={styles.section}>
          <SectionHeader
            title={t("category_filters_title")}
            subtitle={t("category_filters_subtitle")}
          />
          <FilterChipRow
            onToggle={(municipalitySlug) =>
              setSelectedMunicipality((current) => (current === municipalitySlug ? undefined : municipalitySlug))
            }
            options={(municipalitiesQuery.data ?? []).map((municipality) => ({
              id: municipality.slug,
              label: municipality.name,
            }))}
            selectedIds={selectedMunicipality ? [selectedMunicipality] : []}
          />
          <FilterChipRow
            onToggle={(tag) =>
              setSelectedTags((current) =>
                current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
              )
            }
            options={QUICK_FILTERS}
            selectedIds={selectedTags}
          />
        </Animated.View>

        <Animated.View entering={motion.section(160)} style={styles.section}>
          <SectionHeader title={t("category_results_title")} subtitle={t("category_results_count", { count: places.length })} />
          {placesQuery.isError ? (
            <ErrorState onRetry={() => placesQuery.refetch()} />
          ) : !places.length ? (
            <EmptyState
              description={t("category_no_results_hint")}
              title={t("category_no_results")}
            />
          ) : (
            <Animated.View layout={motion.layout} style={styles.list}>
              {places.map((place) => (
                <PlaceCard
                  key={place.slug}
                  onPress={() => router.push(`/places/${place.slug}`)}
                  place={place}
                  variant="list"
                />
              ))}
            </Animated.View>
          )}

          {placesQuery.hasNextPage ? (
            <Pressable
              disabled={placesQuery.isFetchingNextPage}
              onPress={() => placesQuery.fetchNextPage()}
              style={[styles.loadMoreButton, placesQuery.isFetchingNextPage ? styles.loadMoreDisabled : null]}
            >
              {placesQuery.isFetchingNextPage ? (
                <ActivityIndicator color={colors.textMuted} size="small" />
              ) : (
                <Text style={styles.loadMoreLabel}>{t("load_more")}</Text>
              )}
            </Pressable>
          ) : null}
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
    paddingTop: spacing.sm,
  },
  topBar: {
    flexDirection: "row",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  heroCard: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  heroImage: {
    minHeight: 360,
    borderRadius: radius.card,
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    flex: 1,
    justifyContent: "space-between",
    minHeight: 360,
    padding: spacing.lg,
  },
  heroPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroPillLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
  heroTextBlock: {
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.sans.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    lineHeight: 34,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: "88%",
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 8,
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
  },
  loadMoreDisabled: {
    opacity: 0.6,
  },
  loadMoreLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
});
