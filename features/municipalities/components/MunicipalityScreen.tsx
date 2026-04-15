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
import { QUICK_FILTERS } from "@/constants/filters";
import { MunicipalitySwitcher } from "@/features/municipalities/components/MunicipalitySwitcher";
import { useInfinitePlacesQuery, useMunicipalitiesQuery, useMunicipalityOverviewQuery } from "@/hooks/useGuideQueries";
import { colors, radius, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

export const MunicipalityScreen = () => {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const municipalitiesQuery = useMunicipalitiesQuery();
  const overviewQuery = useMunicipalityOverviewQuery(slug);

  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const placesQuery = useInfinitePlacesQuery(
    {
      municipality: slug,
      category: selectedCategory,
      tags: selectedTags,
    },
    Boolean(slug)
  );

  const places = placesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  const onRefresh = async () => {
    await Promise.all([overviewQuery.refetch(), placesQuery.refetch(), municipalitiesQuery.refetch()]);
  };

  if ((overviewQuery.isLoading || placesQuery.isLoading) && !overviewQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page}>
          <SkeletonBlock height={280} style={{ borderRadius: radius.card }} />
          <SkeletonBlock height={20} width={160} />
          <SkeletonBlock height={180} style={{ borderRadius: radius.card }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (overviewQuery.isError) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.page}>
          <ErrorState onRetry={onRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  const municipality = overviewQuery.data?.municipality;
  const categories = overviewQuery.data?.categories ?? [];
  const featuredPlaces = overviewQuery.data?.featuredPlaces ?? [];

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
          <Text style={styles.topBarTitle}>{t("municipality_topbar")}</Text>
          <View style={styles.backButton} />
        </Animated.View>

        {municipality ? (
          <Animated.View entering={motion.hero(40)}>
            <SmartImage alt={municipality.name} style={styles.heroImage} uri={municipality.heroImageUrl}>
              <View style={styles.heroOverlay}>
                <Text style={styles.heroEyebrow}>{municipality.palette.eyebrow}</Text>
                <Text style={styles.heroTitle}>{municipality.name}</Text>
                <Text style={styles.heroDescription}>{municipality.shortDescription}</Text>
              </View>
            </SmartImage>
          </Animated.View>
        ) : null}

        <Animated.View entering={motion.section(90)}>
          <MunicipalitySwitcher
            municipalities={municipalitiesQuery.data ?? []}
            onSelect={(nextSlug) => router.replace(`/municipalities/${nextSlug}`)}
            selectedSlug={slug}
          />
        </Animated.View>

        {featuredPlaces.length ? (
          <Animated.View entering={motion.section(130)} style={styles.section}>
            <SectionHeader title={t("municipality_featured_title")} subtitle={t("municipality_featured_subtitle")} />
            <ScrollView contentContainerStyle={styles.horizontalList} decelerationRate="fast" horizontal showsHorizontalScrollIndicator={false} snapToAlignment="start" snapToInterval={Math.round(require("react-native").Dimensions.get("window").width * 0.72) + 16}>
              {featuredPlaces.slice(0, 5).map((place) => (
                <PlaceCard
                  key={place.slug}
                  onPress={() => router.push(`/places/${place.slug}`)}
                  place={place}
                  variant="compact"
                  showMunicipality={false}
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Animated.View entering={motion.section(180)} style={styles.section}>
          <SectionHeader title={t("municipality_filters_title")} subtitle={t("municipality_filters_subtitle")} />
          <FilterChipRow
            onToggle={(categorySlug) =>
              setSelectedCategory((current) => (current === categorySlug ? undefined : categorySlug))
            }
            options={categories.map((category) => ({ id: category.slug, label: category.name }))}
            selectedIds={selectedCategory ? [selectedCategory] : []}
          />
          <FilterChipRow onToggle={toggleTag} options={QUICK_FILTERS} selectedIds={selectedTags} />
          <View style={styles.viewToggle}>
            <Pressable
              accessibilityLabel={t("municipality_view_list")}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "list" }}
              onPress={() => setViewMode("list")}
              style={[styles.toggleButton, viewMode === "list" ? styles.toggleActive : null]}
            >
              <MaterialCommunityIcons color={viewMode === "list" ? colors.card : colors.textMuted} name="view-agenda-outline" size={18} />
              <Text style={[styles.toggleLabel, viewMode === "list" ? styles.toggleLabelActive : null]}>{t("municipality_view_list")}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t("municipality_view_grid")}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "grid" }}
              onPress={() => setViewMode("grid")}
              style={[styles.toggleButton, viewMode === "grid" ? styles.toggleActive : null]}
            >
              <MaterialCommunityIcons color={viewMode === "grid" ? colors.card : colors.textMuted} name="view-grid-outline" size={18} />
              <Text style={[styles.toggleLabel, viewMode === "grid" ? styles.toggleLabelActive : null]}>{t("municipality_view_grid")}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={motion.section(230)} style={styles.section}>
          <SectionHeader title={t("municipality_all_places")} subtitle={t("municipality_results_count", { count: places.length })} />
          {!places.length ? (
            <EmptyState
              description={t("municipality_no_results_hint")}
              title={t("municipality_no_results")}
            />
          ) : viewMode === "grid" ? (
            <Animated.View layout={motion.layout} style={styles.grid}>
              {places.map((place) => (
                <View key={place.slug} style={styles.gridItem}>
                  <PlaceCard
                    onPress={() => router.push(`/places/${place.slug}`)}
                    place={place}
                    showMunicipality={false}
                    variant="grid"
                  />
                </View>
              ))}
            </Animated.View>
          ) : (
            <Animated.View layout={motion.layout} style={styles.list}>
              {places.map((place) => (
                <PlaceCard
                  key={place.slug}
                  onPress={() => router.push(`/places/${place.slug}`)}
                  place={place}
                  showMunicipality={false}
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  topBarTitle: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  heroImage: {
    minHeight: 320,
    borderRadius: radius.card,
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 320,
    padding: spacing.lg,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.sans.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    lineHeight: 34,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
    overflow: "visible",
  },
  horizontalList: {
    gap: 16,
    paddingBottom: 12,
    paddingLeft: 4,
    paddingRight: spacing.xl,
    paddingTop: 4,
  },
  viewToggle: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggleButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  toggleActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  toggleLabel: {
    color: colors.textMuted,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  toggleLabelActive: {
    color: colors.card,
  },
  list: {
    gap: spacing.md,
    paddingBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridItem: {
    width: "47.5%",
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
