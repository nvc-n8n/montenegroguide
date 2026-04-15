import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useFavoritesStore } from "@/store/favorites-store";
import { colors, typography } from "@/theme";

const iconByRoute = {
  index: "magnify",
  municipalities: "map-outline",
  search: "compass-outline",
  favorites: "heart-outline",
} as const;

const FavoritesTabIcon = ({ color, size }: { color: string; size: number }) => {
  const count = useFavoritesStore((state) => Object.keys(state.favorites).length);
  return (
    <View style={styles.iconWrap}>
      <MaterialCommunityIcons color={color} name="heart-outline" size={size} />
      {count > 0 ? <View style={styles.badge} /> : null}
    </View>
  );
};

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: typography.sans.semiBold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, size }) =>
          route.name === "favorites" ? (
            <FavoritesTabIcon color={color} size={size} />
          ) : (
            <MaterialCommunityIcons
              color={color}
              name={iconByRoute[route.name as keyof typeof iconByRoute]}
              size={size}
            />
          ),
        sceneStyle: {
          backgroundColor: colors.page,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("tab_home") }} />
      <Tabs.Screen name="municipalities" options={{ title: t("tab_municipalities") }} />
      <Tabs.Screen name="search" options={{ title: t("tab_search") }} />
      <Tabs.Screen name="favorites" options={{ title: t("tab_favorites") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: "relative",
  },
  badge: {
    backgroundColor: colors.accent,
    borderColor: colors.card,
    borderRadius: 999,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    right: -4,
    top: -2,
    width: 10,
  },
});
