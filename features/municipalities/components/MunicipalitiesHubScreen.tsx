import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/components/ErrorState";
import { SkeletonBlock } from "@/components/LoadingSkeleton";
import { SmartImage } from "@/components/SmartImage";
import { useMunicipalitiesQuery } from "@/hooks/useGuideQueries";
import { colors, radius, spacing, typography } from "@/theme";

export const MunicipalitiesHubScreen = () => {
  const { t } = useTranslation();
  const municipalitiesQuery = useMunicipalitiesQuery();

  if (municipalitiesQuery.isLoading && !municipalitiesQuery.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.page}>
          <SkeletonBlock height={20} width={120} />
          <SkeletonBlock height={220} style={{ borderRadius: radius.card }} />
          <SkeletonBlock height={220} style={{ borderRadius: radius.card }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (municipalitiesQuery.isError) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.page}>
          <ErrorState onRetry={() => municipalitiesQuery.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl refreshing={municipalitiesQuery.isRefetching} onRefresh={() => municipalitiesQuery.refetch()} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("municipalities_eyebrow")}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t("municipalities_title")}</Text>
          <Text style={styles.subtitle}>
            {t("municipalities_subtitle")}
          </Text>
        </View>

        {municipalitiesQuery.data?.map((municipality) => (
          <Pressable
            key={municipality.slug}
            onPress={() => router.push(`/municipalities/${municipality.slug}`)}
            style={styles.card}
          >
            <SmartImage alt={municipality.name} style={styles.image} uri={municipality.heroImageUrl}>
              <View style={styles.overlay}>
                <Text style={styles.cardEyebrow}>{municipality.palette.eyebrow}</Text>
                <Text style={styles.cardTitle}>{municipality.name}</Text>
                <Text style={styles.cardDescription}>{municipality.shortDescription}</Text>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>{t("municipalities_explore", { count: municipality.placeCount })}</Text>
                </View>
              </View>
            </SmartImage>
          </Pressable>
        ))}
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
    marginBottom: spacing.sm,
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
  card: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  image: {
    minHeight: 270,
    borderRadius: radius.card,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    minHeight: 270,
    padding: spacing.lg,
  },
  cardEyebrow: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.sans.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.card,
    fontFamily: typography.sans.bold,
    fontSize: 28,
    letterSpacing: -0.44,
    lineHeight: 34,
  },
  cardDescription: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  metaPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: spacing.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  metaPillText: {
    color: colors.text,
    fontFamily: typography.sans.medium,
    fontSize: 14,
  },
});
