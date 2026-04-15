import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { FavoriteButton } from "@/components/FavoriteButton";
import { SmartImage } from "@/components/SmartImage";
import { usePressScale } from "@/hooks/usePressScale";
import { colors, radius, shadows, spacing, typography } from "@/theme";
import type { Place } from "@/types/domain";
import { motion } from "@/utils/motion";
import { formatTagLabel } from "@/utils/format";

/**
 * Horizontal-scroll cards should:
 *  - Leave a peek of the next card on narrow screens (signals "there's more").
 *  - Not balloon into full-width banners on tablets/desktop.
 * Exported so horizontal-scroll containers (e.g. HomeScreen) can match their
 * `snapToInterval` to the actual rendered card width.
 */
export const usePlaceCardWidths = () => {
  const { width } = useWindowDimensions();
  return {
    featured: Math.round(Math.min(Math.max(width * 0.82, 260), 380)),
    compact: Math.round(Math.min(Math.max(width * 0.7, 240), 320)),
  };
};

export const PLACE_CARD_GAP = 16;

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  plaze: colors.categoryBeach,
  "nocni-zivot": colors.categoryNightlife,
  restorani: colors.categoryRestaurant,
  priroda: colors.categoryNature,
  tvrdjave: colors.categoryFortress,
  manastiri: colors.categoryMonastery,
  muzeji: colors.categoryMuseum,
  aktivni: colors.categoryActive,
  porodicna: colors.categoryFamily,
  "hidden-gems": colors.categoryHidden,
  znamenitosti: colors.categoryLandmark,
};

const getCategoryColor = (slug: string) =>
  CATEGORY_COLORS[slug] ?? { bg: colors.cardMuted, text: colors.text };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PlaceCardVariant = "featured" | "compact" | "grid" | "list";

interface PlaceCardProps {
  place: Place;
  variant?: PlaceCardVariant;
  onPress: () => void;
  showMunicipality?: boolean;
  showFavoriteButton?: boolean;
}

type MetaBadge = { icon: string; label: string };

const BEACH_KEYS: Record<string, string> = {
  sandy: "badge_sandy",
  pebble: "badge_pebble",
  rocky: "badge_rocky",
  mixed: "badge_mixed",
};

const usePlaceBadges = (place: Place, max: number, t: (key: string) => string): MetaBadge[] => {
  const badges: MetaBadge[] = [];

  if (place.beachType) {
    const key = BEACH_KEYS[place.beachType];
    badges.push({
      icon: "waves",
      label: key ? t(key) : formatTagLabel(place.beachType),
    });
  }
  if (place.familyFriendly) {
    badges.push({ icon: "account-child", label: t("badge_family") });
  }
  if (place.hiddenGem) {
    badges.push({ icon: "diamond-stone", label: t("badge_hidden_gem") });
  }
  if (place.culturalSite) {
    badges.push({ icon: "bank", label: t("badge_cultural") });
  }
  if (place.petFriendly) {
    badges.push({ icon: "paw", label: t("badge_pet_friendly") });
  }
  if (place.activeHoliday) {
    badges.push({ icon: "hiking", label: t("badge_active") });
  }

  for (const bf of place.bestFor.slice(0, 2)) {
    if (badges.length >= max) break;
    badges.push({ icon: "star-outline", label: formatTagLabel(bf) });
  }

  if (!badges.length) {
    badges.push({ icon: "map-marker-outline", label: place.municipalityName });
  }

  return badges.slice(0, max);
};

export const PlaceCard = ({
  place,
  variant = "compact",
  onPress,
  showMunicipality = true,
  showFavoriteButton = true,
}: PlaceCardProps) => {
  const { t } = useTranslation();
  const cardWidths = usePlaceCardWidths();
  const image = place.images[0];
  const isFeatured = variant === "featured";
  const isGrid = variant === "grid";
  const isList = variant === "list";
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(isFeatured ? 0.975 : 0.97);
  const badges = usePlaceBadges(place, isGrid ? 2 : 3, t);

  const widthStyle = isGrid || isList
    ? null
    : { width: isFeatured ? cardWidths.featured : cardWidths.compact };

  return (
    <AnimatedPressable
      accessibilityLabel={`${place.name}, ${place.municipalityName}`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => onPressIn()}
      onPressOut={() => onPressOut()}
      style={[
        styles.card,
        animatedStyle,
        widthStyle,
        isList ? styles.listCard : null,
      ]}
    >
      <View style={isList ? styles.listImageWrap : styles.imageWrap}>
        <SmartImage
          alt={place.name}
          style={[
            styles.image,
            isFeatured ? styles.featuredImage : null,
            isGrid ? styles.gridImage : null,
            isList ? styles.listImage : null,
          ]}
          thumbUri={image?.thumbUrl}
          uri={image?.url}
        />

        {place.featured && !isList ? (
          <View style={styles.featuredPill}>
            <MaterialCommunityIcons color={colors.card} name="star" size={12} />
            <Text style={styles.featuredPillLabel}>{t("badge_featured")}</Text>
          </View>
        ) : null}

        {showFavoriteButton && !isList ? (
          <View style={styles.heartOverlay}>
            <FavoriteButton place={place} />
          </View>
        ) : null}
      </View>

      <View style={[styles.content, isList ? styles.listContent : null]}>
        <View style={styles.categoryRow}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(place.categorySlug).bg }]}>
            <Text style={[styles.categoryLabel, { color: getCategoryColor(place.categorySlug).text }]}>
              {place.categoryName}
            </Text>
          </View>
          {showMunicipality ? (
            <Text style={styles.municipalityLine}>· {place.municipalityName}</Text>
          ) : null}
        </View>

        <Text numberOfLines={2} style={[styles.title, isFeatured ? styles.featuredTitle : null]}>
          {place.name}
        </Text>

        <Text numberOfLines={isList ? 3 : 2} style={styles.description}>
          {place.shortDescription}
        </Text>

        <View style={styles.metaRow}>
          {badges.map((badge, i) => (
            <View key={i} style={styles.metaItem}>
              <MaterialCommunityIcons
                color={colors.textSoft}
                name={badge.icon as never}
                size={14}
              />
              <Text style={styles.metaText}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {isList && showFavoriteButton ? (
          <View style={styles.listFavoriteRow}>
            <FavoriteButton place={place} />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
    ...shadows.card,
  },
  listCard: {
    flexDirection: "row",
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    height: 170,
    width: "100%",
    borderRadius: 0,
  },
  featuredImage: {
    height: 210,
  },
  gridImage: {
    height: 180,
  },
  listImageWrap: {
    width: 140,
  },
  listImage: {
    borderRadius: 0,
    height: "100%",
    width: "100%",
  },
  heartOverlay: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  featuredPill: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    top: 12,
  },
  featuredPillLabel: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  content: {
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  listContent: {
    flex: 1,
  },
  categoryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryLabel: {
    fontFamily: typography.sans.semiBold,
    fontSize: 11,
  },
  municipalityLine: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontFamily: typography.sans.semiBold,
    fontSize: 16,
    letterSpacing: -0.18,
    lineHeight: 22,
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: typography.sans.bold,
    letterSpacing: -0.44,
    lineHeight: 26,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  metaText: {
    color: colors.textSoft,
    fontFamily: typography.sans.medium,
    fontSize: 12,
  },
  listFavoriteRow: {
    alignItems: "flex-end",
    flex: 1,
    justifyContent: "flex-end",
  },
});
