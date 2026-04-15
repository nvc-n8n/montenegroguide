import type { PlacesRequestFilters } from "@/types/api";
import type { Category, FeaturedContent, Municipality, MunicipalityOverview, Place, PlacesListResponse } from "@/types/domain";

export interface PlacesApi {
  getMunicipalities(): Promise<Municipality[]>;
  getCategories(): Promise<Category[]>;
  getPlaces(filters?: PlacesRequestFilters): Promise<PlacesListResponse>;
  getPlaceDetails(slug: string): Promise<Place>;
  getFeatured(): Promise<FeaturedContent>;
  search(query: string): Promise<Place[]>;
  getNearby(lat: number, lng: number, limit?: number): Promise<Place[]>;
  getMunicipalityOverview(slug: string): Promise<MunicipalityOverview>;
}
