import type { PlacesRequestFilters } from "@/types/api";

export const queryKeys = {
  municipalities: ["municipalities"] as const,
  categories: ["categories"] as const,
  featured: ["featured"] as const,
  places: (filters?: PlacesRequestFilters) => ["places", filters ?? {}] as const,
  placesList: (filters?: PlacesRequestFilters) => ["places-list", filters ?? {}] as const,
  place: (slug: string) => ["place", slug] as const,
  nearby: (lat?: number, lng?: number, limit?: number) => ["nearby", lat, lng, limit] as const,
  municipalityOverview: (slug: string) => ["municipality-overview", slug] as const,
  search: (query: string) => ["search", query] as const,
} as const;
