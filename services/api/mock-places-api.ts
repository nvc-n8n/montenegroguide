import categoriesSeed from "@/mocks/data/categories.json";
import municipalitiesSeed from "@/mocks/data/municipalities.json";
import placesSeed from "@/mocks/data/places.json";
import { APP_CONFIG } from "@/constants/app-config";
import type {
  PlacesRequestFilters,
  RawCategoryDto,
  RawMunicipalityDto,
  RawMunicipalityOverviewDto,
  RawPlaceDto,
} from "@/types/api";
import type { Category, FeaturedContent, Municipality, MunicipalityOverview, Place, PlacesListResponse } from "@/types/domain";
import { getDistanceKm } from "@/utils/distance";
import { slugify } from "@/utils/format";
import { mapCategory, mapFeaturedContent, mapMunicipality, mapMunicipalityOverview, mapPlace, sortPlacesByEditorialWeight } from "@/services/mappers/place-mappers";
import type { PlacesApi } from "@/services/api/places-api";

const wait = (ms: number = APP_CONFIG.mockLatencyMs) => new Promise((resolve) => setTimeout(resolve, ms));

const municipalitiesData = municipalitiesSeed as RawMunicipalityDto[];
const categoriesData = categoriesSeed as RawCategoryDto[];
const placesData = placesSeed as RawPlaceDto[];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const matchesQuickTag = (place: RawPlaceDto, tag: string) => {
  const tags = place.tags ?? [];

  switch (tag) {
    case "family":
      return Boolean(place.family_friendly) || tags.includes("family");
    case "romantic":
      return tags.includes("romantic");
    case "hidden":
      return Boolean(place.hidden_gem) || tags.includes("hidden");
    case "nightlife":
      return Boolean(place.nightlife) || tags.includes("nightlife");
    case "sandy":
      return place.beach_type === "pijesak" || tags.includes("sandy");
    case "rocky":
      return place.beach_type === "kamen" || place.beach_type === "stijene" || tags.includes("rocky");
    case "culture":
      return Boolean(place.cultural_site) || tags.includes("culture");
    case "active-holiday":
      return Boolean(place.active_holiday) || tags.includes("active-holiday");
    case "free-access":
      return tags.includes("free-access");
    case "beach-club":
      return tags.includes("beach-club");
    case "parking-nearby":
      return Boolean(place.parking_available) || tags.includes("parking-nearby");
    default:
      return tags.includes(tag);
  }
};

const matchesFilters = (place: RawPlaceDto, filters?: PlacesRequestFilters) => {
  if (!filters) {
    return true;
  }

  if (filters.municipality) {
    const municipalityQuery = normalizeText(filters.municipality);
    const municipalityName = normalizeText(place.municipality ?? "");
    if (normalizeText(place.municipality_slug) !== municipalityQuery && municipalityName !== municipalityQuery) {
      return false;
    }
  }

  if (filters.category) {
    const categoryQuery = normalizeText(filters.category);
    const categorySlug = normalizeText(place.category_slug ?? slugify(place.category ?? ""));
    const categoryName = normalizeText(place.category ?? "");

    if (categorySlug !== categoryQuery && categoryName !== categoryQuery) {
      return false;
    }
  }

  if (typeof filters.featured === "boolean" && Boolean(place.featured) !== filters.featured) {
    return false;
  }

  if (filters.tags?.length) {
    const allTagsMatch = filters.tags.every((tag) => matchesQuickTag(place, tag));
    if (!allTagsMatch) {
      return false;
    }
  }

  if (filters.q) {
    const query = normalizeText(filters.q);
    const haystack = normalizeText(
      [
        place.name,
        ...(place.alternate_names ?? []),
        place.municipality ?? "",
        place.category ?? "",
        ...(place.tags ?? []),
      ].join(" ")
    );

    if (!haystack.includes(query)) {
      return false;
    }
  }

  return true;
};

const getFilteredPlaces = (filters?: PlacesRequestFilters) =>
  placesData.filter((place) => matchesFilters(place, filters)).sort((left, right) => {
    if (Boolean(left.featured) !== Boolean(right.featured)) {
      return Number(Boolean(right.featured)) - Number(Boolean(left.featured));
    }

    return (right.popularity_score ?? 0) - (left.popularity_score ?? 0);
  });

export class MockPlacesApi implements PlacesApi {
  async getMunicipalities(): Promise<Municipality[]> {
    await wait();
    return municipalitiesData.map(mapMunicipality);
  }

  async getCategories(): Promise<Category[]> {
    await wait();
    return categoriesData.map(mapCategory);
  }

  async getPlaces(filters?: PlacesRequestFilters): Promise<PlacesListResponse> {
    await wait();
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? APP_CONFIG.pageSize;
    const filtered = getFilteredPlaces(filters);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated.map(mapPlace),
      total: filtered.length,
      page,
      limit,
      hasNextPage: offset + limit < filtered.length,
    };
  }

  async getPlaceDetails(slug: string): Promise<Place> {
    await wait();
    const place = placesData.find((item) => item.slug === slug);

    if (!place) {
      throw new Error("Mjesto nije pronađeno.");
    }

    return mapPlace(place);
  }

  async getFeatured(): Promise<FeaturedContent> {
    await wait();
    const featuredPlaces = sortPlacesByEditorialWeight(placesData.map(mapPlace).filter((place) => place.featured));
    const municipality = municipalitiesData.find((item) => item.slug === "kotor") ?? municipalitiesData[0];

    return mapFeaturedContent({
      featured_municipality: municipality,
      beaches: featuredPlaces.filter((place) => place.categorySlug === "plaze").slice(0, 6).map((place) => {
        const raw = placesData.find((item) => item.slug === place.slug);
        return raw!;
      }),
      attractions: featuredPlaces
        .filter((place) =>
          ["znamenitosti", "tvrdjave-stari-gradovi", "muzeji-kultura", "manastiri-crkve"].includes(place.categorySlug)
        )
        .slice(0, 6)
        .map((place) => placesData.find((item) => item.slug === place.slug)!),
      taste_and_nightlife: featuredPlaces
        .filter((place) => ["restorani-beach-barovi", "nocni-zivot"].includes(place.categorySlug) || place.nightlife)
        .slice(0, 6)
        .map((place) => placesData.find((item) => item.slug === place.slug)!),
      active_escapes: featuredPlaces
        .filter((place) => ["aktivni-odmor", "priroda-vidikovci"].includes(place.categorySlug) || place.activeHoliday)
        .slice(0, 6)
        .map((place) => placesData.find((item) => item.slug === place.slug)!),
    });
  }

  async search(query: string): Promise<Place[]> {
    await wait(180);
    return getFilteredPlaces({ q: query, limit: 20 }).slice(0, 20).map(mapPlace);
  }

  async getNearby(lat: number, lng: number, limit = 6): Promise<Place[]> {
    await wait(180);
    return placesData
      .filter((place) => place.lat != null && place.lng != null)
      .map((place) => ({
        ...place,
        distance_km: getDistanceKm({ lat, lng }, { lat: place.lat!, lng: place.lng! }),
      }))
      .sort((left, right) => (left.distance_km ?? 0) - (right.distance_km ?? 0))
      .slice(1, limit + 1)
      .map(mapPlace);
  }

  async getMunicipalityOverview(slug: string): Promise<MunicipalityOverview> {
    await wait();
    const municipality = municipalitiesData.find((item) => item.slug === slug);

    if (!municipality) {
      throw new Error("Opština nije pronađena.");
    }

    const municipalityPlaces = placesData.filter((place) => place.municipality_slug === slug);
    const categories = categoriesData
      .map((category) => ({
        ...category,
        count: municipalityPlaces.filter(
          (place) => (place.category_slug ?? slugify(place.category ?? "")) === category.slug
        ).length,
      }))
      .filter((category) => (category.count ?? 0) > 0);

    const rawOverview: RawMunicipalityOverviewDto = {
      ...municipality,
      categories,
      featured_places: municipalityPlaces.filter((place) => place.featured).slice(0, 6),
    };

    return mapMunicipalityOverview(rawOverview);
  }
}
