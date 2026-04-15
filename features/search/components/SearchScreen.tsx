import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterChipRow } from "@/components/FilterChipRow";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeader } from "@/components/SectionHeader";
import { QUICK_FILTERS } from "@/constants/filters";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCategoriesQuery,
  useFeaturedQuery,
  useInfinitePlacesQuery,
  useMunicipalitiesQuery,
  useSearchQuery,
} from "@/hooks/useGuideQueries";
import { colors, spacing, typography } from "@/theme";
import { motion } from "@/utils/motion";

export const SearchScreen = () => {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ filter?: string | string[] }>();
  const popularSearches = [t("popular_beaches"), t("popular_sunset"), t("popular_family"), t("popular_nightlife")];
  const municipalitiesQuery = useMunicipalitiesQuery();
  const categoriesQuery = useCategoriesQuery();
  const featuredQuery = useFeaturedQuery();

  const [query, setQuery] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const incoming = params.filter;
    if (!incoming) return [];
    return Array.isArray(incoming) ? incoming : [incoming];
  });

  useEffect(() => {
    const incoming = params.filter;
    if (!incoming) return;
    const next = Array.isArray(incoming) ? incoming : [incoming];
    setSelectedTags((current) => {
      const merged = new Set([...current, ...next]);
      return merged.size === current.length ? current : Array.from(merged);
    });
  }, [params.filter]);

  const quickFilterOptions = useMemo(
    () =>
      QUICK_FILTERS.map((filter) => ({
        id: filter.id,
        label: t(filter.labelKey, { defaultValue: filter.label }),
      })),
    [t]
  );

  const debouncedQuery = useDebouncedValue(query.trim(), 240);
  const useDirectSearch =
    debouncedQuery.length >= 2 &&
    !selectedMunicipality &&
    !selectedCategory &&
    selectedTags.length === 0;
  const useFilteredSearch =
    debouncedQuery.length >= 2 ||
    Boolean(selectedMunicipality) ||
    Boolean(selectedCategory) ||
    selectedTags.length > 0;

  const directSearchQuery = useSearchQuery(debouncedQuery);
  const filteredSearchQuery = useInfinitePlacesQuery(
    {
      q: debouncedQuery || undefined,
      municipality: selectedMunicipality,
      category: selectedCategory,
      tags: selectedTags,
      limit: 20,
    },
    useFilteredSearch && !useDirectSearch
  );

  const results = useDirectSearch
    ? directSearchQuery.data ?? []
    : filteredSearchQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const onRefresh = async () => {
    await Promise.all([
      municipalitiesQuery.refetch(),
      categoriesQuery.refetch(),
      featuredQuery.refetch(),
      directSearchQuery.refetch(),
      filteredSearchQuery.refetch(),
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={directSearchQuery.isRefetching || filteredSearchQuery.isRefetching}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={motion.section(20)} style={styles.header}>
          <Text style={styles.eyebrow}>{t("search_eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t("search_title")}</Text>
        </Animated.View>

        <Animated.View entering={motion.section(80)}>
          <SearchBar onChangeText={setQuery} placeholder={t("search_placeholder")} value={query} />
        </Animated.View>

        <Animated.View entering={motion.section(130)} style={styles.section}>
          <SectionHeader title={t("search_popular_title")} subtitle={t("search_popular_subtitle")} />
          <ScrollView contentContainerStyle={styles.inlineChips} horizontal showsHorizontalScrollIndicator={false}>
            {popularSearches.map((item) => (
              <Pressable key={item} onPress={() => setQuery(item)} style={styles.inlineChip}>
                <Text style={styles.inlineChipLabel}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={motion.section(180)} style={styles.section}>
          <SectionHeader title={t("search_filters_title")} subtitle={t("search_filters_subtitle")} />
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
            onToggle={(categorySlug) =>
              setSelectedCategory((current) => (current === categorySlug ? undefined : categorySlug))
            }
            options={(categoriesQuery.data ?? []).map((category) => ({
              id: category.slug,
              label: category.name,
            }))}
            selectedIds={selectedCategory ? [selectedCategory] : []}
          />
          <FilterChipRow
            onToggle={(tag) =>
              setSelectedTags((current) =>
                current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
              )
            }
            options={quickFilterOptions}
            selectedIds={selectedTags}
          />
        </Animated.View>

        {useFilteredSearch ? (
          <Animated.View entering={motion.section(230)} style={styles.section}>
            <SectionHeader title={t("search_results_title")} subtitle={t("search_results_count", { count: results.length })} />
            {directSearchQuery.isError || filteredSearchQuery.isError ? (
              <ErrorState onRetry={onRefresh} />
            ) : !results.length ? (
              <EmptyState
                description={t("search_no_results_hint")}
                title={t("search_no_results")}
              />
            ) : (
              <Animated.View layout={motion.layout} style={styles.list}>
                {results.map((place) => (
                  <PlaceCard key={place.slug} onPress={() => router.push(`/places/${place.slug}`)} place={place} variant="list" />
                ))}
              </Animated.View>
            )}

            {!useDirectSearch && filteredSearchQuery.hasNextPage ? (
              <Pressable
                disabled={filteredSearchQuery.isFetchingNextPage}
                onPress={() => filteredSearchQuery.fetchNextPage()}
                style={[styles.loadMoreButton, filteredSearchQuery.isFetchingNextPage ? styles.loadMoreDisabled : null]}
              >
                {filteredSearchQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.textMuted} size="small" />
                ) : (
                  <Text style={styles.loadMoreLabel}>{t("load_more")}</Text>
                )}
              </Pressable>
            ) : null}
          </Animated.View>
        ) : (
          <Animated.View entering={motion.section(230)} style={styles.section}>
            <SectionHeader title={t("search_inspiration_title")} subtitle={t("search_inspiration_subtitle")} />
            <Animated.View layout={motion.layout} style={styles.list}>
              {featuredQuery.data?.beaches.slice(0, 2).map((place) => (
                <PlaceCard key={place.slug} onPress={() => router.push(`/places/${place.slug}`)} place={place} variant="list" />
              ))}
            </Animated.View>
          </Animated.View>
        )}
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
  section: {
    gap: spacing.md,
  },
  inlineChips: {
    gap: spacing.sm,
  },
  inlineChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inlineChipLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
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
