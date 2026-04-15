import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GestureResponderEvent, Platform, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useFavoritesStore } from "@/store/favorites-store";
import { colors, shadows } from "@/theme";
import type { Place } from "@/types/domain";

interface FavoriteButtonProps {
  place: Place;
}

export const FavoriteButton = ({ place }: FavoriteButtonProps) => {
  const { t } = useTranslation();
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => Boolean(state.favorites[place.slug]));

  const label = isFavorite ? t("favorite_remove") : t("favorite_add");

  const onPress = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    await Haptics.selectionAsync().catch(() => undefined);
    toggleFavorite(place);
  };

  // On web, use a <div> with onClick to avoid nested <button> inside PlaceCard's <button>
  if (Platform.OS === "web") {
    return (
      <View
        aria-label={label}
        // @ts-expect-error — RNW supports onClick on View
        onClick={(e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          Haptics.selectionAsync().catch(() => undefined);
          toggleFavorite(place);
        }}
        style={styles.button}
      >
        <MaterialCommunityIcons
          color={isFavorite ? colors.accent : colors.text}
          name={isFavorite ? "heart" : "heart-outline"}
          size={20}
        />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <MaterialCommunityIcons
        color={isFavorite ? colors.accent : colors.text}
        name={isFavorite ? "heart" : "heart-outline"}
        size={20}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    ...shadows.soft,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
});
