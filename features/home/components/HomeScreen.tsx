import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { CategoryGrid, type CategoryCover } from "@/components/CategoryGrid";
import { DotLoader } from "@/components/DotLoader";
import { ErrorState } from "@/components/ErrorState";
import { LanguagePicker } from "@/components/LanguagePicker";
import { QuickPicksRow } from "@/components/QuickPicksRow";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeader } from "@/components/SectionHeader";
import { SkeletonBlock } from "@/components/LoadingSkeleton";
import { PlaceCard, PLACE_CARD_GAP, usePlaceCardWidths } from "@/components/PlaceCard";
import { SmartImage } from "@/components/SmartImage";
import { CATEGORY_COVER_FALLBACKS } from "@/constants/category-cover-fallbacks";
import type { QuickFilterId } from "@/constants/filters";
import {
  useCategoriesQuery,
  useFeaturedQuery,
  useMunicipalitiesQuery,
  useMunicipalityOverviewQuery,
} from "@/hooks/useGuideQueries";
import { MunicipalitySwitcher } from "@/features/municipalities/components/MunicipalitySwitcher";
import { colors, radius, shadows, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

export const HomeScreen = () => {
  const { t } = useTranslation();
  const cardWidths = usePlaceCardWidths();
  const featuredSnap = cardWidths.featured + PLACE_CARD_GAP;
  const compactSnap = cardWidths.compact + PLACE_CARD_GAP;
  const municipalitiesQuery = useMunicipalitiesQuery();
  const categoriesQuery = useCategoriesQuery();
  const featuredQuery = useFeaturedQuery();

  const [selectedMunicipalitySlug, setSelectedMunicipalitySlug] = useState<string>();

  useEffect(() => {
    if (!selectedMunicipalitySlug) {
      setSelectedMunicipalitySlug(
        featuredQuery.data?.municipality?.slug ?? municipalitiesQuery.data?.[0]?.slug
      );
    }
  }, [featuredQuery.data?.municipality?.slug, municipalitiesQuery.data, selectedMunicipalitySlug]);

  const municipalityOverviewQuery = useMunicipalityOverviewQuery(selectedMunicipalitySlug || "");
  const featuredMunicipality = municipalityOverviewQuery.data?.municipality ?? featuredQuery.data?.municipality;

  const categoryCovers = useMemo(
    () =>
      categoriesQuery.data?.reduce<Record<string, CategoryCover>>((accumulator, category) => {
        if (category.coverImageUrl) {
          accumulator[category.slug] = {
            imageUrl: category.coverImageUrl,
            thumbUrl: category.coverThumbUrl,
            highlight: CATEGORY_COVER_FALLBACKS[category.slug]?.highlight,
          };
        }
        return accumulator;
      }, {}),
    [categoriesQuery.data]
  );

  const totalPlaces = useMemo(
    () => (categoriesQuery.data ?? []).reduce((sum, category) => sum + (category.placeCount ?? 0), 0),
    [categoriesQuery.data]
  );
  const totalCities = municipalitiesQuery.data?.length ?? 0;

  const onRefresh = async () => {
    await Promise.all([
      municipalitiesQuery.refetch(),
      categoriesQuery.refetch(),
      featuredQuery.refetch(),
      municipalityOverviewQuery.refetch(),
    ]);
  };

  const handleQuickPick = (filterId: QuickFilterId) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { filter: filterId },
    });
  };

  if (
    (municipalitiesQuery.isLoading || categoriesQuery.isLoading || featuredQuery.isLoading) &&
    !municipalitiesQuery.data &&
    !featuredQuery.data
  ) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page} scrollEnabled={false}>
          <SkeletonBlock height={20} width={120} />
          <SkeletonBlock height={54} style={{ borderRadius: 999 }} />
          <View style={styles.skeletonHeroWrap}>
            <SkeletonBlock height={280} style={{ borderRadius: radius.card }} />
            <View style={styles.skeletonDots}>
              <DotLoader size="md" />
            </View>
          </View>
          <SkeletonBlock height={160} style={{ borderRadius: radius.card }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (municipalitiesQuery.isError || categoriesQuery.isError || featuredQuery.isError) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.page}>
          <ErrorState onRetry={onRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  const municipalities = municipalitiesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const featured = featuredQuery.data;
  const featuredPlaces = municipalityOverviewQuery.data?.featuredPlaces ?? [];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={municipalityOverviewQuery.isRefetching} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={motion.section(20)} style={styles.header}>
          <Text style={styles.eyebrow}>{t("home_eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {t("home_title")}
          </Text>
          <Text style={styles.subtitle}>{t("home_subtitle")}</Text>
        </Animated.View>

        <Animated.View entering={motion.section(45)}>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <MaterialCommunityIcons color={colors.accent} name="map-marker-radius" size={14} />
              <Text style={styles.statLabel}>{t("home_stats_places", { count: totalPlaces })}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons color={colors.sea} name="city-variant-outline" size={14} />
              <Text style={styles.statLabel}>{t("home_stats_cities", { count: totalCities })}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons color={colors.sand} name="calendar-month-outline" size={14} />
              <Text style={styles.statLabel}>{t("home_stats_updated")}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={motion.section(75)}>
          <LanguagePicker />
        </Animated.View>

        <Animated.View entering={motion.section(105)}>
          <SearchBar editable={false} onPress={() => router.push("/(tabs)/search")} />
        </Animated.View>

        <Animated.View entering={motion.section(130)} style={styles.section}>
          <SectionHeader
            title={t("home_popular_title")}
            subtitle={t("home_popular_subtitle")}
          />
          <QuickPicksRow onPress={handleQuickPick} />
        </Animated.View>

        <Animated.View entering={motion.section(165)}>
          <MunicipalitySwitcher
            municipalities={municipalities}
            onSelect={setSelectedMunicipalitySlug}
            selectedSlug={selectedMunicipalitySlug}
          />
        </Animated.View>

        {featuredMunicipality ? (
          <Animated.View entering={motion.hero(195)}>
            <Pressable
              onPress={() => router.push(`/municipalities/${featuredMunicipality.slug}`)}
              style={styles.heroCard}
            >
              <SmartImage
                alt={featuredMunicipality.name}
                style={styles.heroImage}
                uri={featuredMunicipality.heroImageUrl}
              >
                <View style={styles.heroOverlay}>
                  <Text style={styles.heroEyebrow}>{featuredMunicipality.palette.eyebrow}</Text>
                  <Text style={styles.heroTitle}>{featuredMunicipality.name}</Text>
                  <Text numberOfLines={3} style={styles.heroDescription}>
                    {featuredMunicipality.shortDescription}
                  </Text>
                  <View style={styles.heroMetaRow}>
                    <View style={styles.heroPillGhost}>
                      <MaterialCommunityIcons color={colors.card} name="map-marker-outline" size={14} />
                      <Text style={styles.heroPillGhostLabel}>
                        {t("home_places_count", { count: featuredMunicipality.placeCount })}
                      </Text>
                    </View>
                    <View style={styles.heroPillPrimary}>
                      <Text style={styles.heroPillPrimaryLabel}>{t("home_open_guide")}</Text>
                      <MaterialCommunityIcons color={colors.card} name="arrow-right" size={16} />
                    </View>
                  </View>
                </View>
              </SmartImage>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={motion.section(230)} style={styles.section}>
          <SectionHeader
            actionLabel={t("home_see_all")}
            onAction={() => router.push("/(tabs)/municipalities")}
            subtitle={t("home_category_subtitle")}
            title={t("home_category_title")}
          />
          <CategoryGrid
            categories={categories}
            covers={categoryCovers}
            onPress={(category, cover) =>
              router.push({
                pathname: "/categories/[slug]",
                params: {
                  slug: category.slug,
                  coverHighlight: cover?.highlight ?? CATEGORY_COVER_FALLBACKS[category.slug]?.highlight,
                  coverImage: cover?.imageUrl ?? CATEGORY_COVER_FALLBACKS[category.slug]?.imageUrl,
                  coverThumb: cover?.thumbUrl,
                  coverTitle: CATEGORY_COVER_FALLBACKS[category.slug]?.title ?? category.name,
                },
              })
            }
          />
        </Animated.View>

        {featuredPlaces.length ? (
          <Animated.View entering={motion.section(290)} style={styles.section}>
            <SectionHeader
              actionLabel={t("home_view_all")}
              onAction={() => featuredMunicipality && router.push(`/municipalities/${featuredMunicipality.slug}`)}
              subtitle={t("home_top_picks_subtitle")}
              title={t("home_top_picks", { name: featuredMunicipality?.name ?? "obalu" })}
            />
            <ScrollView
              contentContainerStyle={styles.horizontalList}
              decelerationRate="fast"
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={featuredSnap}
            >
              {featuredPlaces.slice(0, 6).map((place) => (
                <PlaceCard
                  key={place.slug}
                  onPress={() => router.push(`/places/${place.slug}`)}
                  place={place}
                  variant="featured"
                />
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {featured ? (
          <>
            <Animated.View entering={motion.section(340)} style={styles.section}>
              <SectionHeader title={t("home_beaches_title")} subtitle={t("home_beaches_subtitle")} />
              <ScrollView
                contentContainerStyle={styles.horizontalList}
                decelerationRate="fast"
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={compactSnap}
              >
                {featured.beaches.map((place) => (
                  <PlaceCard
                    key={place.slug}
                    onPress={() => router.push(`/places/${place.slug}`)}
                    place={place}
                    variant="compact"
                  />
                ))}
              </ScrollView>
            </Animated.View>

            <Animated.View entering={motion.section(390)} style={styles.section}>
              <SectionHeader title={t("home_attractions_title")} subtitle={t("home_attractions_subtitle")} />
              <ScrollView
                contentContainerStyle={styles.horizontalList}
                decelerationRate="fast"
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={compactSnap}
              >
                {featured.attractions.map((place) => (
                  <PlaceCard
                    key={place.slug}
                    onPress={() => router.push(`/places/${place.slug}`)}
                    place={place}
                    variant="compact"
                  />
                ))}
              </ScrollView>
            </Animated.View>

            <Animated.View entering={motion.section(440)} style={styles.section}>
              <SectionHeader title={t("home_nightlife_title")} subtitle={t("home_nightlife_subtitle")} />
              <ScrollView
                contentContainerStyle={styles.horizontalList}
                decelerationRate="fast"
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={compactSnap}
              >
                {featured.tasteAndNightlife.map((place) => (
                  <PlaceCard
                    key={place.slug}
                    onPress={() => router.push(`/places/${place.slug}`)}
                    place={place}
                    variant="compact"
                  />
                ))}
              </ScrollView>
            </Animated.View>
          </>
        ) : null}
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
    maxWidth: "92%",
  },
  statsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statChip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  statLabel: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 13,
  },
  statDot: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 3,
    width: 3,
  },
  heroCard: {
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.card,
  },
  heroImage: {
    minHeight: 340,
    borderRadius: radius.card,
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 340,
    padding: spacing.lg,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: typography.sans.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 32,
    letterSpacing: -0.44,
    lineHeight: 38,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  heroMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroPillGhost: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillGhostLabel: {
    color: colors.card,
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
  heroPillPrimary: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadows.soft,
  },
  heroPillPrimaryLabel: {
    color: colors.card,
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
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
  skeletonHeroWrap: {
    position: "relative",
  },
  skeletonDots: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
