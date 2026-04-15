import { CATEGORY_ICON_MAP } from "@/constants/category-icons";
import { MUNICIPALITY_META } from "@/constants/municipalities";
import { resolveApiAssetUrl, wikiThumb } from "@/services/api/client";
import type {
  RawCategoryDto,
  RawFeaturedDto,
  RawMunicipalityDto,
  RawMunicipalityOverviewDto,
  RawPlaceDto,
  RawPlaceImageDto,
} from "@/types/api";
import type { Category, FeaturedContent, GuideImage, Municipality, MunicipalityOverview, Place } from "@/types/domain";
import { slugify, titleCase } from "@/utils/format";

const DEFAULT_PALETTE = {
  accent: "#12628A",
  accentSoft: "#DAECF6",
  shell: "#F6F1E8",
  overlay: "rgba(10, 32, 44, 0.54)",
  eyebrow: "Morski ritam",
  heroFallback: undefined as string | undefined,
};

const toGuideImage = (raw: RawPlaceImageDto, fallbackAlt: string): GuideImage | null => {
  const url = raw.public_url ?? raw.url ?? null;

  if (!url) {
    return null;
  }

  const resolved = resolveApiAssetUrl(url) ?? url;

  return {
    url: resolved,
    thumbUrl: wikiThumb(resolveApiAssetUrl(raw.thumb_public_url ?? raw.thumb_url ?? undefined), 400),
    alt: raw.alt_text ?? raw.alt ?? fallbackAlt,
    licenseLabel: raw.license_label ?? undefined,
    credit: raw.credit ?? undefined,
  };
};

const mapPlaceImages = (raw: RawPlaceDto): GuideImage[] => {
  const mapped = (raw.images ?? [])
    .map((image) => toGuideImage(image, raw.name))
    .filter((image): image is GuideImage => Boolean(image));

  if (mapped.length > 0) {
    return mapped;
  }

  if (raw.image_url) {
    return [
      {
        url: raw.image_url,
        thumbUrl: wikiThumb(raw.thumb_url ?? undefined, 400),
        alt: raw.name,
      },
    ];
  }

  return [];
};

export const mapMunicipality = (raw: RawMunicipalityDto): Municipality => {
  const meta = MUNICIPALITY_META[raw.slug as keyof typeof MUNICIPALITY_META] ?? DEFAULT_PALETTE;

  return {
    id: String(raw.id),
    slug: raw.slug,
    name: raw.name,
    region: raw.region ?? "primorje",
    shortDescription: raw.short_description ?? "",
    heroImageUrl: resolveApiAssetUrl(raw.hero_image_url ?? undefined) ?? meta.heroFallback,
    placeCount: raw.place_count ?? 0,
    palette: {
      accent: meta.accent,
      accentSoft: meta.accentSoft,
      shell: meta.shell,
      overlay: meta.overlay,
      eyebrow: meta.eyebrow,
    },
  };
};

export const mapCategory = (raw: RawCategoryDto): Category => ({
  id: String(raw.id),
  slug: raw.slug,
  name: raw.name,
  icon: CATEGORY_ICON_MAP[raw.slug] ?? raw.icon ?? "map-marker-outline",
  placeCount: raw.place_count ?? raw.count ?? 0,
  coverImageUrl: raw.cover_image_url ?? undefined,
  coverThumbUrl: raw.cover_thumb_url ?? undefined,
});

export const mapPlace = (raw: RawPlaceDto): Place => {
  const municipalityName =
    raw.municipality_name ?? raw.municipality ?? titleCase(raw.municipality_slug.replace(/-/g, " "));
  const categorySlug = raw.category_slug ?? slugify(raw.category_name ?? raw.category ?? "ostalo");
  const categoryName = raw.category_name ?? raw.category ?? titleCase(categorySlug.replace(/-/g, " "));

  return {
    id: String(raw.id),
    slug: raw.slug,
    name: raw.name,
    alternateNames: raw.alternate_names ?? [],
    municipalityName,
    municipalitySlug: raw.municipality_slug,
    categoryName,
    categorySlug,
    subtype: raw.subtype ?? undefined,
    coordinates:
      raw.lat != null && raw.lng != null
        ? {
            lat: raw.lat,
            lng: raw.lng,
          }
        : undefined,
    shortDescription: raw.short_description ?? "",
    longDescription: raw.long_description ?? raw.short_description ?? "",
    tags: raw.tags ?? [],
    amenities: raw.amenities ?? [],
    bestFor: raw.best_for ?? [],
    images: mapPlaceImages(raw),
    featured: Boolean(raw.featured),
    familyFriendly: Boolean(raw.family_friendly),
    hiddenGem: Boolean(raw.hidden_gem),
    nightlife: Boolean(raw.nightlife),
    activeHoliday: Boolean(raw.active_holiday),
    culturalSite: Boolean(raw.cultural_site),
    beachType: raw.beach_type ?? undefined,
    parkingAvailable: Boolean(raw.parking_available),
    petFriendly: Boolean(raw.pet_friendly),
    accessibilityNotes: raw.accessibility_notes ?? undefined,
    popularityScore: raw.popularity_score ?? (raw.featured ? 92 : 72),
    distanceKm: raw.distance_km,
  };
};

export const sortPlacesByEditorialWeight = (places: Place[]) =>
  [...places].sort((left, right) => {
    if (left.featured !== right.featured) {
      return Number(right.featured) - Number(left.featured);
    }

    return right.popularityScore - left.popularityScore;
  });

export const mapMunicipalityOverview = (raw: RawMunicipalityOverviewDto): MunicipalityOverview => ({
  municipality: mapMunicipality(raw),
  categories: (raw.categories ?? []).map(mapCategory),
  featuredPlaces: sortPlacesByEditorialWeight((raw.featured_places ?? []).map(mapPlace)),
});

export const mapFeaturedContent = (raw: RawFeaturedDto): FeaturedContent => ({
  municipality: raw.featured_municipality
    ? mapMunicipality(raw.featured_municipality)
    : raw.municipality
      ? mapMunicipality(raw.municipality)
      : null,
  beaches: sortPlacesByEditorialWeight((raw.beaches ?? []).map(mapPlace)),
  attractions: sortPlacesByEditorialWeight((raw.attractions ?? []).map(mapPlace)),
  tasteAndNightlife: sortPlacesByEditorialWeight(
    (raw.taste_and_nightlife ?? raw.food_and_nightlife ?? raw.nightlife ?? []).map(mapPlace)
  ),
  activeEscapes: sortPlacesByEditorialWeight((raw.active_escapes ?? raw.activities ?? []).map(mapPlace)),
});
