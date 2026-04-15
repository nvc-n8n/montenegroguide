import { APP_CONFIG } from "@/constants/app-config";
import type { PlacesApi } from "@/services/api/places-api";
import { getSupabaseClient } from "@/services/api/supabase-client";
import {
  mapCategory,
  mapFeaturedContent,
  mapMunicipality,
  mapMunicipalityOverview,
  mapPlace,
} from "@/services/mappers/place-mappers";
import type {
  PlacesRequestFilters,
  RawCategoryDto,
  RawMunicipalityDto,
  RawMunicipalityOverviewDto,
  RawPlaceDto,
} from "@/types/api";
import type {
  Category,
  FeaturedContent,
  Municipality,
  MunicipalityOverview,
  Place,
  PlacesListResponse,
} from "@/types/domain";

/**
 * Supabase-backed implementation of PlacesApi.
 *
 * Talks to PostgREST (views/tables) and RPC functions defined in
 * backend/scripts/supabase_bundle.sql. Returns data shaped to match RawPlaceDto
 * so the existing mappers in services/mappers/place-mappers.ts keep working.
 */
export class SupabasePlacesApi implements PlacesApi {
  private get client() {
    return getSupabaseClient();
  }

  async getMunicipalities(): Promise<Municipality[]> {
    const { data, error } = await this.client
      .from("municipalities_full")
      .select("id, slug, name, region, short_description, place_count")
      .order("id", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => mapMunicipality(row as RawMunicipalityDto));
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.client
      .from("categories_with_counts")
      .select("id, slug, name, icon, place_count")
      .order("place_count", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => mapCategory(row as RawCategoryDto));
  }

  async getPlaces(filters?: PlacesRequestFilters): Promise<PlacesListResponse> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? APP_CONFIG.pageSize;
    const from = (page - 1) * limit;
    const to = page * limit - 1;

    let query = this.client
      .from("places_full")
      .select("*", { count: "exact" })
      .order("featured", { ascending: false })
      .order("popularity_score", { ascending: false })
      .range(from, to);

    if (filters?.municipality) {
      query = query.eq("municipality_slug", filters.municipality);
    }
    if (filters?.category) {
      query = query.eq("category_slug", filters.category);
    }
    if (typeof filters?.featured === "boolean") {
      query = query.eq("featured", filters.featured);
    }
    if (filters?.hidden_gem) {
      query = query.eq("hidden_gem", true);
    }
    if (filters?.family_friendly) {
      query = query.eq("family_friendly", true);
    }
    if (filters?.q) {
      const needle = filters.q.replace(/,/g, " ").trim();
      if (needle.length > 0) {
        const pattern = `%${needle}%`;
        query = query.or(
          `name.ilike.${pattern},short_description.ilike.${pattern}`,
        );
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const items = (data ?? []).map((row) => mapPlace(row as RawPlaceDto));
    const total = count ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  async getPlaceDetails(slug: string): Promise<Place> {
    const { data, error } = await this.client
      .from("places_full")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(`Place not found: ${slug}`);
    }
    return mapPlace(data as RawPlaceDto);
  }

  async getFeatured(): Promise<FeaturedContent> {
    // One pull of the top featured places, then split client-side by category.
    const { data, error } = await this.client
      .from("places_full")
      .select("*")
      .eq("featured", true)
      .order("popularity_score", { ascending: false })
      .limit(24);

    if (error) throw error;
    const featuredPlaces = (data ?? []).map((row) => mapPlace(row as RawPlaceDto));

    // Pick the first municipality with data as the "featured municipality" card.
    const municipalities = await this.getMunicipalities();
    const municipality =
      municipalities.find((m) => m.slug === "kotor") ?? municipalities[0] ?? null;

    return mapFeaturedContent({
      featured_municipality: municipality
        ? {
            id: municipality.id,
            slug: municipality.slug,
            name: municipality.name,
            region: municipality.region,
            short_description: municipality.shortDescription,
            place_count: municipality.placeCount,
          }
        : null,
      beaches: toRawPlaces(featuredPlaces, (p) => p.categorySlug === "plaze"),
      attractions: toRawPlaces(featuredPlaces, (p) =>
        ["znamenitosti", "tvrdjave-stari-gradovi", "muzeji-kultura", "manastiri-crkve"].includes(
          p.categorySlug,
        ),
      ),
      taste_and_nightlife: toRawPlaces(
        featuredPlaces,
        (p) => ["restorani-beach-barovi", "nocni-zivot"].includes(p.categorySlug) || p.nightlife,
      ),
      active_escapes: toRawPlaces(
        featuredPlaces,
        (p) => ["aktivni-odmor", "priroda-vidikovci"].includes(p.categorySlug) || p.activeHoliday,
      ),
    });
  }

  async search(query: string): Promise<Place[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const { data, error } = await this.client.rpc("places_search", {
      in_query: trimmed,
      in_limit: 30,
    });

    if (error) throw error;
    return (data ?? []).map((row: unknown) => mapPlace(row as RawPlaceDto));
  }

  async getNearby(lat: number, lng: number, limit = 6): Promise<Place[]> {
    const { data, error } = await this.client.rpc("places_nearby", {
      in_lat: lat,
      in_lng: lng,
      in_limit: limit,
    });

    if (error) throw error;
    return (data ?? []).map((row: unknown) => mapPlace(row as RawPlaceDto));
  }

  async getMunicipalityOverview(slug: string): Promise<MunicipalityOverview> {
    const { data: municipality, error: municipalityError } = await this.client
      .from("municipalities_full")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (municipalityError) throw municipalityError;
    if (!municipality) {
      throw new Error(`Municipality not found: ${slug}`);
    }

    const { data: featuredPlaces, error: featuredError } = await this.client
      .from("places_full")
      .select("*")
      .eq("municipality_slug", slug)
      .eq("featured", true)
      .order("popularity_score", { ascending: false })
      .limit(6);

    if (featuredError) throw featuredError;

    // `category_breakdown` comes back as JSONB: [{ slug, name, icon, place_count }, ...]
    const breakdown = (municipality.category_breakdown ?? []) as Array<{
      slug: string;
      name: string;
      icon?: string;
      place_count: number;
    }>;

    const raw: RawMunicipalityOverviewDto = {
      id: municipality.id,
      slug: municipality.slug,
      name: municipality.name,
      region: municipality.region ?? undefined,
      short_description: municipality.short_description ?? undefined,
      place_count: municipality.place_count ?? undefined,
      categories: breakdown.map(
        (c): RawCategoryDto => ({
          id: c.slug,
          slug: c.slug,
          name: c.name,
          icon: c.icon ?? null,
          place_count: c.place_count,
        }),
      ),
      featured_places: (featuredPlaces ?? []) as RawPlaceDto[],
    };

    return mapMunicipalityOverview(raw);
  }
}

/**
 * Filter already-mapped Place domain objects back into RawPlaceDto shape so
 * mapFeaturedContent can run them through the same mapper pipeline as the
 * HTTP path. We rebuild only the fields the mapper actually reads.
 */
const toRawPlaces = (places: Place[], predicate: (p: Place) => boolean): RawPlaceDto[] =>
  places.filter(predicate).map(
    (p): RawPlaceDto => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      alternate_names: p.alternateNames,
      municipality: p.municipalityName,
      municipality_slug: p.municipalitySlug,
      municipality_name: p.municipalityName,
      category: p.categoryName,
      category_name: p.categoryName,
      category_slug: p.categorySlug,
      subtype: p.subtype,
      lat: p.coordinates?.lat,
      lng: p.coordinates?.lng,
      short_description: p.shortDescription,
      long_description: p.longDescription,
      tags: p.tags,
      amenities: p.amenities,
      best_for: p.bestFor,
      images: p.images.map((img) => ({
        url: img.url,
        thumb_url: img.thumbUrl,
        alt: img.alt,
        license_label: img.licenseLabel,
        credit: img.credit,
      })),
      featured: p.featured,
      family_friendly: p.familyFriendly,
      hidden_gem: p.hiddenGem,
      nightlife: p.nightlife,
      active_holiday: p.activeHoliday,
      cultural_site: p.culturalSite,
      beach_type: p.beachType,
      parking_available: p.parkingAvailable,
      pet_friendly: p.petFriendly,
      accessibility_notes: p.accessibilityNotes,
      popularity_score: p.popularityScore,
      distance_km: p.distanceKm,
    }),
  );
