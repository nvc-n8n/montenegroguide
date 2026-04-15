import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { SmartImage } from "@/components/SmartImage";
import { CATEGORY_COVER_FALLBACKS } from "@/constants/category-cover-fallbacks";
import { usePressScale } from "@/hooks/usePressScale";
import { colors, radius, spacing, typography } from "@/theme";
import type { Category } from "@/types/domain";
import { motion } from "@/utils/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CategoryCover {
  imageUrl?: string;
  thumbUrl?: string;
  placeName?: string;
  highlight?: string;
}

interface CategoryGridProps {
  categories: Category[];
  covers?: Record<string, CategoryCover>;
  onPress: (category: Category, cover?: CategoryCover) => void;
}

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

type CategoryTileProps = {
  category: Category;
  cover?: CategoryCover;
  onPress: () => void;
  size: "primary" | "secondary" | "banner";
  index: number;
};

const CategoryTile = ({ category, cover, onPress, size, index }: CategoryTileProps) => {
  const { t } = useTranslation();
  const fallback = CATEGORY_COVER_FALLBACKS[category.slug];
  const tileSize = getSizeStyles(size);
  const imageUrl = cover?.imageUrl ?? fallback?.imageUrl;
  const titleTranslationKey = `cat_title_${category.slug}`;
  const translatedTitle = t(titleTranslationKey, { defaultValue: "" });
  const title =
    (translatedTitle && translatedTitle !== titleTranslationKey ? translatedTitle : undefined) ??
    fallback?.title ??
    category.name;

  const highlightKey = `cat_hi_${category.slug}`;
  const translatedHighlight = t(highlightKey, { defaultValue: "" });
  const highlight =
    (translatedHighlight && translatedHighlight !== highlightKey
      ? translatedHighlight
      : undefined) ??
    cover?.highlight ??
    fallback?.highlight ??
    "";
  const highlightLines = size === "primary" ? 2 : 1;
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(size === "primary" ? 0.988 : 0.982);

  return (
    <Animated.View entering={motion.item(index * 70)} style={tileSize.wrap}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => onPressIn()}
        onPressOut={() => onPressOut()}
        style={[styles.pressable, animatedStyle]}
      >
        <SmartImage alt={category.name} style={tileSize.image} thumbUri={cover?.thumbUrl} uri={imageUrl}>
          <View style={styles.tileOverlay} />
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons color={colors.card} name={category.icon as never} size={16} />
          </View>
          <View style={styles.textOverlay}>
            <Text numberOfLines={2} style={styles.tileTitle}>
              {title}
            </Text>
            {highlight ? (
              <Text numberOfLines={highlightLines} style={styles.tileHighlight}>
                {highlight}
              </Text>
            ) : null}
            <Text style={styles.tileCount}>
              {t("home_stats_places", { count: category.placeCount })}
            </Text>
          </View>
        </SmartImage>
      </AnimatedPressable>
    </Animated.View>
  );
};

const getSizeStyles = (size: "primary" | "secondary" | "banner") => {
  if (size === "primary") {
    return {
      wrap: styles.primaryWrap,
      image: styles.primaryImage,
    };
  }

  if (size === "secondary") {
    return {
      wrap: styles.secondaryWrap,
      image: styles.secondaryImage,
    };
  }

  return {
    wrap: styles.bannerWrap,
    image: styles.bannerImage,
  };
};

export const CategoryGrid = ({ categories, covers, onPress }: CategoryGridProps) => {
  const groups = chunk(categories, 4);
  let tileIndex = 0;

  return (
    <View style={styles.mosaic}>
      {groups.map((group, groupIndex) => {
        const reverse = groupIndex % 2 === 1;
        const primary = group[0];
        const topSecondary = group[1];
        const bottomSecondary = group[2];
        const banner = group[3];

        return (
          <View key={`${groupIndex}-${primary?.slug ?? "group"}`} style={styles.group}>
            <View style={[styles.topRow, reverse ? styles.topRowReverse : null]}>
              {primary ? (
                <CategoryTile
                  category={primary}
                  cover={covers?.[primary.slug]}
                  index={tileIndex++}
                  onPress={() => onPress(primary, covers?.[primary.slug])}
                  size="primary"
                />
              ) : null}

              {(topSecondary || bottomSecondary) ? (
                <View style={styles.secondaryColumn}>
                  {topSecondary ? (
                    <CategoryTile
                      category={topSecondary}
                      cover={covers?.[topSecondary.slug]}
                      index={tileIndex++}
                      onPress={() => onPress(topSecondary, covers?.[topSecondary.slug])}
                      size="secondary"
                    />
                  ) : null}
                  {bottomSecondary ? (
                    <CategoryTile
                      category={bottomSecondary}
                      cover={covers?.[bottomSecondary.slug]}
                      index={tileIndex++}
                      onPress={() => onPress(bottomSecondary, covers?.[bottomSecondary.slug])}
                      size="secondary"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {banner ? (
              <CategoryTile
                category={banner}
                cover={covers?.[banner.slug]}
                index={tileIndex++}
                onPress={() => onPress(banner, covers?.[banner.slug])}
                size="banner"
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  mosaic: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  topRowReverse: {
    flexDirection: "row-reverse",
  },
  secondaryColumn: {
    flex: 0.4,
    gap: spacing.sm,
  },
  primaryWrap: {
    flex: 0.6,
  },
  secondaryWrap: {
    flex: 1,
  },
  bannerWrap: {
    width: "100%",
  },
  pressable: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  primaryImage: {
    minHeight: 280,
    borderRadius: radius.card,
  },
  secondaryImage: {
    minHeight: 170,
    borderRadius: radius.card,
  },
  bannerImage: {
    minHeight: 180,
    borderRadius: radius.card,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    left: 14,
    position: "absolute",
    top: 14,
    width: 34,
  },
  textOverlay: {
    bottom: 0,
    gap: 4,
    left: 0,
    padding: 16,
    paddingTop: 48,
    position: "absolute",
    right: 0,
  },
  tileTitle: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 16,
    letterSpacing: -0.18,
    lineHeight: 20,
  },
  tileHighlight: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.sans.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  tileCount: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: typography.sans.semiBold,
    fontSize: 12,
    marginTop: 2,
  },
});
