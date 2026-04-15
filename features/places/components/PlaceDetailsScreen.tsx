import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonBlock } from "@/components/LoadingSkeleton";
import { PlaceCard } from "@/components/PlaceCard";
import { SmartImage } from "@/components/SmartImage";
import { useNearbyPlacesQuery, usePlaceDetailsQuery } from "@/hooks/useGuideQueries";
import { useFavoritesStore } from "@/store/favorites-store";
import { colors, radius, shadows, spacing, typography } from "@/theme";
import { openDirections } from "@/utils/directions";
import { formatTagLabel } from "@/utils/format";
import { motion } from "@/utils/motion";
import type { Place } from "@/types/domain";

/* ---------- chip palette — Airbnb warm tones ---------- */
const chipPalette = {
  teal: { bg: "#e0f4f4", text: "#008489", border: "#b2e0e3" },
  warm: { bg: "#fff3e0", text: "#c67100", border: "#ffe0b2" },
  coral: { bg: "#fce4ec", text: "#c62828", border: "#f8bbd0" },
  neutral: { bg: "#f7f7f7", text: "#484848", border: "#e0e0e0" },
  entryFee: { bg: "#fff8e1", text: "#c67100", border: "#ffe082" },
  duration: { bg: "#e3f2fd", text: "#1565c0", border: "#bbdefb" },
  bestTime: { bg: "#e8f5e9", text: "#2e7d32", border: "#c8e6c9" },
  familyFriendly: { bg: "#fce4ec", text: "#c62828", border: "#f8bbd0" },
  petFriendly: { bg: "#e8f5e9", text: "#2e7d32", border: "#c8e6c9" },
  parking: { bg: "#ede7f6", text: "#5e35b1", border: "#d1c4e9" },
  hiddenGem: { bg: "#fff8e1", text: "#c67100", border: "#ffe082" },
  sightseeing: { bg: "#e3f2fd", text: "#1565c0", border: "#bbdefb" },
  photography: { bg: "#fff3e0", text: "#c67100", border: "#ffe0b2" },
  swimming: { bg: "#e0f4f4", text: "#008489", border: "#b2e0e3" },
  hiking: { bg: "#e8f5e9", text: "#2e7d32", border: "#c8e6c9" },
  culture: { bg: "#ede7f6", text: "#5e35b1", border: "#d1c4e9" },
  defaultFor: { bg: "#f7f7f7", text: "#484848", border: "#e0e0e0" },
} as const;
type ChipColor = keyof typeof chipPalette;
const chipColorOrder: ChipColor[] = ["teal", "warm", "coral", "neutral"];

interface ColorChipProps {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: ChipColor;
}

const ColorChip = ({ label, icon, color = "neutral" }: ColorChipProps) => {
  const palette = chipPalette[color];
  return (
    <View
      style={[
        styles.colorChip,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
        },
      ]}
    >
      {icon ? <MaterialCommunityIcons color={palette.text} name={icon} size={16} /> : null}
      <Text style={[styles.colorChipLabel, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const BEACH_TYPE_KEYS: Record<string, string> = {
  sandy: "beach_type_sandy",
  pebble: "beach_type_pebble",
  rocky: "beach_type_rocky",
  mixed: "beach_type_mixed",
};

const BeachTypePill = ({ type }: { type: string }) => {
  const { t } = useTranslation();
  const key = BEACH_TYPE_KEYS[type];
  if (!key) return null;
  return (
    <View style={styles.beachTypePill}>
      <MaterialCommunityIcons color="#008489" name="waves" size={14} />
      <Text style={styles.beachTypePillLabel}>{t(key)}</Text>
    </View>
  );
};

const TagPill = ({ label }: { label: string }) => (
  <View style={styles.tagPill}>
    <Text style={styles.tagPillLabel}>{label}</Text>
  </View>
);

/* ---------- helper: pick chip color by activity ---------- */
const getBestForColor = (item: string): ChipColor => {
  const lower = item.toLowerCase();
  if (lower.includes("sight") || lower.includes("razgled")) return "sightseeing";
  if (lower.includes("photo") || lower.includes("foto")) return "photography";
  if (lower.includes("swim") || lower.includes("kupanje") || lower.includes("pliva")) return "swimming";
  if (lower.includes("walk") || lower.includes("hik") || lower.includes("setn")) return "hiking";
  if (lower.includes("history") || lower.includes("istor") || lower.includes("cultur") || lower.includes("kultur")) return "culture";
  if (lower.includes("snorkel") || lower.includes("div") || lower.includes("ronjenje")) return "swimming";
  if (lower.includes("sunset") || lower.includes("zalaz")) return "photography";
  if (lower.includes("adventure") || lower.includes("avantur")) return "hiking";
  if (lower.includes("food") || lower.includes("hrana") || lower.includes("gastro")) return "warm";
  if (lower.includes("night") || lower.includes("noc")) return "coral";
  if (lower.includes("family") || lower.includes("porodic")) return "familyFriendly";
  if (lower.includes("relax") || lower.includes("opust")) return "teal";
  if (lower.includes("romantic") || lower.includes("romanticno")) return "coral";
  return "defaultFor";
};

const AmenityChip = ({ label, index }: { label: string; index: number }) => {
  const color = chipColorOrder[index % chipColorOrder.length];
  const palette = chipPalette[color];
  return (
    <View
      style={[
        styles.amenityChip,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
        },
      ]}
    >
      <Text style={[styles.amenityChipLabel, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

/* ---------- helpers ---------- */
const getDurationKey = (place: Place): string => {
  if (place.categorySlug === "beaches" || place.categorySlug === "plaze") return "place_duration_medium";
  if (place.culturalSite) return "place_duration_medium";
  if (place.activeHoliday) return "place_duration_long";
  return "place_duration_short";
};

const getTimeKey = (place: Place): string => {
  if (place.categorySlug === "beaches" || place.categorySlug === "plaze") return "place_best_time_morning";
  if (place.nightlife) return "place_best_time_sunset";
  return "place_best_time_anytime";
};

export const PlaceDetailsScreen = () => {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const placeQuery = usePlaceDetailsQuery(slug);
  const nearbyQuery = useNearbyPlacesQuery(placeQuery.data?.coordinates?.lat, placeQuery.data?.coordinates?.lng, 5);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => Boolean(placeQuery.data && state.favorites[placeQuery.data.slug]));

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(nextIndex);
  };

  const handleFavoritePress = async () => {
    if (!placeQuery.data) {
      return;
    }

    await Haptics.selectionAsync().catch(() => undefined);
    toggleFavorite(placeQuery.data);
  };

  const handleRoutePress = async () => {
    if (!placeQuery.data) {
      return;
    }

    await openDirections(placeQuery.data);
  };

  if (placeQuery.isLoading && !placeQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page}>
          <SkeletonBlock height={320} style={{ borderRadius: 0 }} />
          <SkeletonBlock height={24} width={220} />
          <SkeletonBlock height={180} style={{ borderRadius: radius.card }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (placeQuery.isError || !placeQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.page}>
          <ErrorState onRetry={() => placeQuery.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const place = placeQuery.data;
  const images = place.images.length ? place.images : [{ url: "", alt: place.name }];
  const nearbyPlaces = (nearbyQuery.data ?? []).filter((item) => item.slug !== place.slug);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 140 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={motion.hero(20)} style={styles.heroWrap}>
            <ScrollView
              horizontal
              onMomentumScrollEnd={handleImageScroll}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {images.map((image, index) => (
                <SmartImage
                  key={`${image.url}-${index}`}
                  alt={image.alt}
                  style={{ width, height: 360, borderRadius: 0 }}
                  thumbUri={image.thumbUrl}
                  uri={image.url}
                />
              ))}
            </ScrollView>

            <View style={styles.heroControls}>
              <Pressable accessibilityLabel={t("back")} accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={styles.heroButton}>
                <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
              </Pressable>
              <Pressable accessibilityLabel={isFavorite ? t("favorite_remove") : t("favorite_add")} accessibilityRole="button" onPress={handleFavoritePress} style={styles.heroButton}>
                <MaterialCommunityIcons
                  color={isFavorite ? colors.accent : colors.text}
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                />
              </Pressable>
            </View>

            <View style={styles.pagination}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === currentImageIndex ? styles.dotActive : null]}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={motion.section(90)} style={styles.content}>
            <Animated.View entering={motion.section(120)} style={styles.titleBlock}>
              <Text accessibilityRole="header" style={styles.title}>{place.name}</Text>
              <Text style={styles.locationLine}>
                {place.municipalityName} · {place.categoryName}
                {place.subtype ? ` · ${place.subtype}` : ""}
              </Text>
              <Text style={styles.shortDescription}>{place.shortDescription}</Text>
            </Animated.View>

            <View style={styles.divider} />

            <Animated.View entering={motion.section(150)} style={styles.pillGroup}>
              {place.beachType ? <BeachTypePill type={place.beachType} /> : null}
              {place.tags.map((tag) => (
                <TagPill key={tag} label={formatTagLabel(tag)} />
              ))}
            </Animated.View>

            {place.longDescription && place.longDescription !== place.shortDescription ? (
              <Animated.View entering={motion.section(180)} style={styles.copyBlock}>
                <Text style={styles.sectionTitle}>{t("place_why_visit")}</Text>
                <Text style={styles.paragraph}>{place.longDescription}</Text>
              </Animated.View>
            ) : null}

            {place.amenities.length ? (
              <Animated.View entering={motion.section(210)} style={styles.copyBlock}>
                <Text style={styles.sectionTitle}>{t("place_amenities")}</Text>
                <View style={styles.pillGroup}>
                  {place.amenities.map((item, index) => (
                    <AmenityChip key={item} index={index} label={item} />
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* ---------- Good to know ---------- */}
            <Animated.View entering={motion.section(240)} style={styles.goodToKnowCard}>
              <Text style={styles.sectionTitle}>{t("place_good_to_know")}</Text>
              <View style={styles.pillGroup}>
                <ColorChip
                  color="entryFee"
                  icon="ticket-outline"
                  label={place.tags.includes("slobodan_pristup") ? t("place_entry_free") : t("place_entry_paid")}
                />
                <ColorChip color="duration" icon="clock-outline" label={t(getDurationKey(place))} />
                <ColorChip color="bestTime" icon="weather-sunset" label={t(getTimeKey(place))} />
                {place.familyFriendly ? <ColorChip color="familyFriendly" icon="account-child" label={t("place_family_friendly")} /> : null}
                {place.hiddenGem ? <ColorChip color="hiddenGem" icon="diamond-stone" label={t("place_hidden_gem")} /> : null}
                {place.petFriendly ? <ColorChip color="petFriendly" icon="paw" label={t("place_pet_ok")} /> : null}
                {place.parkingAvailable ? <ColorChip color="parking" icon="car" label={t("place_parking_available")} /> : null}
              </View>
            </Animated.View>

            {/* ---------- Perfect for ---------- */}
            {place.bestFor.length ? (
              <Animated.View entering={motion.section(270)} style={styles.copyBlock}>
                <Text style={styles.sectionTitle}>{t("place_perfect_for")}</Text>
                <View style={styles.pillGroup}>
                  {place.bestFor.map((item) => (
                    <ColorChip
                      key={item}
                      color={getBestForColor(item)}
                      label={item}
                    />
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {place.accessibilityNotes ? (
              <Animated.View entering={motion.section(285)} style={styles.noteCard}>
                <MaterialCommunityIcons color={colors.textSoft} name="information-outline" size={20} />
                <Text style={styles.noteText}>{place.accessibilityNotes}</Text>
              </Animated.View>
            ) : null}

            {/* ---------- Getting there ---------- */}
            <Animated.View entering={motion.section(300)} style={styles.gettingThereCard}>
              <View style={styles.gettingThereHeader}>
                <View style={styles.gettingThereIconWrap}>
                  <MaterialCommunityIcons color={colors.text} name="map-marker-radius-outline" size={22} />
                </View>
                <View style={styles.gettingThereTextWrap}>
                  <Text style={styles.gettingThereTitle}>{t("place_getting_there")}</Text>
                  <Text style={styles.gettingThereHint}>{t("place_map_hint")}</Text>
                </View>
              </View>
              <View style={styles.routeButtonWrap}>
                <Pressable onPress={handleRoutePress} style={styles.routeButton}>
                  <MaterialCommunityIcons color={colors.card} name="navigation-variant-outline" size={16} />
                  <Text style={styles.routeButtonLabel}>{t("place_open_route")}</Text>
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={motion.section(330)} style={styles.copyBlock}>
              <Text style={styles.sectionTitle}>{t("place_nearby")}</Text>
              {nearbyPlaces.length ? (
                <ScrollView contentContainerStyle={styles.horizontalList} decelerationRate="fast" horizontal showsHorizontalScrollIndicator={false} snapToAlignment="start" snapToInterval={Math.round(require("react-native").Dimensions.get("window").width * 0.72) + 16}>
                  {nearbyPlaces.map((nearbyPlace) => (
                    <PlaceCard
                      key={nearbyPlace.slug}
                      onPress={() => router.push(`/places/${nearbyPlace.slug}`)}
                      place={nearbyPlace}
                      variant="compact"
                    />
                  ))}
                </ScrollView>
              ) : (
                <EmptyState
                  description={t("place_nearby_empty_hint")}
                  title={t("place_nearby_empty")}
                />
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={motion.section(120)} style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable onPress={handleFavoritePress} style={styles.secondaryAction}>
            <MaterialCommunityIcons
              color={isFavorite ? colors.accent : colors.text}
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
            />
            <Text style={styles.secondaryActionLabel}>{t("place_save")}</Text>
          </Pressable>
          <Pressable onPress={handleRoutePress} style={styles.primaryAction}>
            <MaterialCommunityIcons color={colors.card} name="navigation-variant-outline" size={18} />
            <Text style={styles.primaryActionLabel}>{t("place_open_route")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.page,
    flex: 1,
  },
  page: {
    paddingBottom: 40,
  },
  heroWrap: {
    position: "relative",
  },
  heroControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    top: 16,
  },
  heroButton: {
    alignItems: "center",
    backgroundColor: colors.whiteOverlayStrong,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pagination: {
    alignItems: "center",
    bottom: 16,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  dot: {
    backgroundColor: colors.whiteOverlaySubtle,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: colors.card,
    width: 20,
  },
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  titleBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    lineHeight: 34,
  },
  locationLine: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  shortDescription: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  copyBlock: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 18,
    letterSpacing: -0.18,
  },
  paragraph: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  pillGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  beachTypePill: {
    alignItems: "center",
    backgroundColor: "#e0f4f4",
    borderColor: "#b2e0e3",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  beachTypePillLabel: {
    color: "#008489",
    fontFamily: typography.sans.semiBold,
    fontSize: 13,
  },
  tagPill: {
    backgroundColor: colors.cardMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagPillLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
  amenityChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  amenityChipLabel: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
  colorChip: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  colorChipLabel: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
  goodToKnowCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  gettingThereCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadows.soft,
  },
  gettingThereHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  gettingThereIconWrap: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  gettingThereTextWrap: {
    flex: 1,
    gap: 3,
  },
  gettingThereTitle: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 16,
  },
  gettingThereHint: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  routeButtonWrap: {
    alignItems: "flex-start",
  },
  routeButton: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  routeButtonLabel: {
    color: colors.card,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  noteCard: {
    alignItems: "center",
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  noteText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  horizontalList: {
    gap: 16,
    paddingBottom: 12,
    paddingLeft: 4,
    paddingRight: spacing.lg,
    paddingTop: 4,
  },
  stickyBar: {
    backgroundColor: colors.pageAlpha,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    position: "absolute",
    right: 0,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionLabel: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  primaryActionLabel: {
    color: colors.card,
    fontFamily: typography.sans.medium,
    fontSize: 15,
  },
});
