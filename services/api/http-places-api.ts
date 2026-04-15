import { APP_CONFIG } from "@/constants/app-config";
import { getJson } from "@/services/api/client";
import type { PlacesApi } from "@/services/api/places-api";
import { mapCategory, mapFeaturedContent, mapMunicipality, mapMunicipalityOverview, mapPlace } from "@/services/mappers/place-mappers";
import type {
  PlacesRequestFilters,
  RawCategoryDto,
  RawFeaturedDto,
  RawMunicipalityDto,
  RawMunicipalityOverviewDto,
  RawPlaceDto,
} from "@/types/api";
import type { Category, FeaturedContent, Municipality, MunicipalityOverview, Place, PlacesListResponse } from "@/types/domain";

const getCollection = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    const arrayLike = candidate.items ?? candidate.results ?? candidate.data ?? candidate.places;
    if (Array.isArray(arrayLike)) {
      return arrayLike as T[];
    }
  }

  return [];
};

const getPaginationMeta = (payload: unknown, page: number, limit: number, size: number) => {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const candidate = payload as Record<string, unknown>;
    const total = typeof candidate.total === "number" ? candidate.total : size;
    const payloadPage = typeof candidate.page === "number" ? candidate.page : page;
    const payloadLimit = typeof candidate.limit === "number" ? candidate.limit : limit;
    const hasNextPage =
      typeof candidate.hasNextPage === "boolean"
        ? candidate.hasNextPage
        : typeof candidate.has_next_page === "boolean"
          ? candidate.has_next_page
          : payloadPage * payloadLimit < total;

    return {
      total,
      page: payloadPage,
      limit: payloadLimit,
      hasNextPage,
    };
  }

  return {
    total: size,
    page,
    limit,
    hasNextPage: size >= limit,
  };
};

export class HttpPlacesApi implements PlacesApi {
  async getMunicipalities(): Promise<Municipality[]> {
    const payload = await getJson<RawMunicipalityDto[] | { items: RawMunicipalityDto[] }>("municipalities");
    return getCollection<RawMunicipalityDto>(payload).map(mapMunicipality);
  }

  async getCategories(): Promise<Category[]> {
    const payload = await getJson<RawCategoryDto[] | { items: RawCategoryDto[] }>("categories");
    return getCollection<RawCategoryDto>(payload).map(mapCategory);
  }

  async getPlaces(filters?: PlacesRequestFilters): Promise<PlacesListResponse> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? APP_CONFIG.pageSize;
    const payload = await getJson<unknown>("places", filters);
    const items = getCollection<RawPlaceDto>(payload).map(mapPlace);
    const meta = getPaginationMeta(payload, page, limit, items.length);

    return {
      items,
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      hasNextPage: meta.hasNextPage,
    };
  }

  async getPlaceDetails(slug: string): Promise<Place> {
    const payload = await getJson<RawPlaceDto>(`places/${slug}`);
    return mapPlace(payload);
  }

  async getFeatured(): Promise<FeaturedContent> {
    try {
      const payload = await getJson<RawFeaturedDto>("featured");
      const featured = mapFeaturedContent(payload);

      if (
        featured.beaches.length ||
        featured.attractions.length ||
        featured.tasteAndNightlife.length ||
        featured.activeEscapes.length
      ) {
        return featured;
      }
    } catch {
      // Fallback below
    }

    const [municipalities, featuredPlaces] = await Promise.all([
      this.getMunicipalities(),
      this.getPlaces({ featured: true, limit: 24, page: 1 }),
    ]);

    const items = featuredPlaces.items;

    return {
      municipality: municipalities[0] ?? null,
      beaches: items.filter((place) => place.categorySlug === "plaze").slice(0, 6),
      attractions: items
        .filter((place) =>
          ["znamenitosti", "tvrdjave-stari-gradovi", "muzeji-kultura", "manastiri-crkve"].includes(place.categorySlug)
        )
        .slice(0, 6),
      tasteAndNightlife: items
        .filter((place) => ["restorani-beach-barovi", "nocni-zivot"].includes(place.categorySlug) || place.nightlife)
        .slice(0, 6),
      activeEscapes: items
        .filter((place) => ["aktivni-odmor", "priroda-vidikovci"].includes(place.categorySlug) || place.activeHoliday)
        .slice(0, 6),
    };
  }

  async search(query: string): Promise<Place[]> {
    const payload = await getJson<unknown>("search", { q: query });
    return getCollection<RawPlaceDto>(payload).map(mapPlace);
  }

  async getNearby(lat: number, lng: number, limit = 6): Promise<Place[]> {
    const payload = await getJson<unknown>("nearby", { lat, lng, limit });
    return getCollection<RawPlaceDto>(payload).map(mapPlace);
  }

  async getMunicipalityOverview(slug: string): Promise<MunicipalityOverview> {
    const payload = await getJson<RawMunicipalityOverviewDto>(`municipalities/${slug}/overview`);
    return mapMunicipalityOverview(payload);
  }
}
