import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { APP_CONFIG } from "@/constants/app-config";
import { placesApi } from "@/services/api";
import type { PlacesRequestFilters } from "@/types/api";
import { queryKeys } from "@/utils/query-keys";

export const useMunicipalitiesQuery = () =>
  useQuery({
    queryKey: queryKeys.municipalities,
    queryFn: () => placesApi.getMunicipalities(),
  });

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => placesApi.getCategories(),
  });

export const useFeaturedQuery = () =>
  useQuery({
    queryKey: queryKeys.featured,
    queryFn: () => placesApi.getFeatured(),
  });

export const useMunicipalityOverviewQuery = (slug: string) =>
  useQuery({
    queryKey: queryKeys.municipalityOverview(slug),
    queryFn: () => placesApi.getMunicipalityOverview(slug),
    enabled: slug.length > 0,
  });

export const usePlaceDetailsQuery = (slug: string) =>
  useQuery({
    queryKey: queryKeys.place(slug),
    queryFn: () => placesApi.getPlaceDetails(slug),
    enabled: Boolean(slug),
  });

export const useNearbyPlacesQuery = (lat?: number, lng?: number, limit = 6) =>
  useQuery({
    queryKey: queryKeys.nearby(lat, lng, limit),
    queryFn: () => placesApi.getNearby(lat!, lng!, limit),
    enabled: typeof lat === "number" && typeof lng === "number",
  });

export const useSearchQuery = (query: string) =>
  useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => placesApi.search(query),
    enabled: query.trim().length >= 2,
  });

export const useInfinitePlacesQuery = (filters?: PlacesRequestFilters, enabled = true) =>
  useInfiniteQuery({
    queryKey: queryKeys.places(filters),
    initialPageParam: 1,
    enabled,
    queryFn: ({ pageParam }) =>
      placesApi.getPlaces({
        ...filters,
        page: pageParam,
        limit: filters?.limit ?? APP_CONFIG.pageSize,
      }),
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
  });

export const usePlacesQuery = (filters?: PlacesRequestFilters, enabled = true) =>
  useQuery({
    queryKey: queryKeys.placesList(filters),
    enabled,
    queryFn: () =>
      placesApi.getPlaces({
        ...filters,
        limit: filters?.limit ?? APP_CONFIG.pageSize,
        page: filters?.page ?? 1,
      }),
  });
