export interface RawPlaceImageDto {
  url?: string | null;
  thumb_url?: string | null;
  alt?: string | null;
  license_label?: string | null;
  credit?: string | null;
  public_url?: string | null;
  thumb_public_url?: string | null;
  alt_text?: string | null;
  is_primary?: boolean;
}

export interface RawPlaceDto {
  id: string | number;
  slug: string;
  name: string;
  alternate_names?: string[];
  municipality?: string;
  municipality_name?: string;
  municipality_slug: string;
  category?: string;
  category_name?: string;
  category_slug?: string;
  subtype?: string | null;
  lat?: number | null;
  lng?: number | null;
  short_description?: string | null;
  long_description?: string | null;
  tags?: string[];
  amenities?: string[];
  best_for?: string[];
  images?: RawPlaceImageDto[];
  featured?: boolean;
  family_friendly?: boolean;
  hidden_gem?: boolean;
  nightlife?: boolean;
  active_holiday?: boolean;
  cultural_site?: boolean;
  beach_type?: string | null;
  parking_available?: boolean;
  pet_friendly?: boolean;
  accessibility_notes?: string | null;
  image_url?: string | null;
  thumb_url?: string | null;
  popularity_score?: number;
  distance_km?: number;
}

export interface RawCategoryDto {
  id: string | number;
  slug: string;
  name: string;
  icon?: string | null;
  place_count?: number;
  count?: number;
  cover_image_url?: string | null;
  cover_thumb_url?: string | null;
}

export interface RawMunicipalityDto {
  id: string | number;
  slug: string;
  name: string;
  region?: string;
  short_description?: string | null;
  hero_image_url?: string | null;
  place_count?: number;
}

export interface RawMunicipalityOverviewDto extends RawMunicipalityDto {
  categories?: RawCategoryDto[];
  featured_places?: RawPlaceDto[];
}

export interface RawFeaturedDto {
  featured_municipality?: RawMunicipalityDto | null;
  municipality?: RawMunicipalityDto | null;
  beaches?: RawPlaceDto[];
  attractions?: RawPlaceDto[];
  nightlife?: RawPlaceDto[];
  taste_and_nightlife?: RawPlaceDto[];
  food_and_nightlife?: RawPlaceDto[];
  activities?: RawPlaceDto[];
  active_escapes?: RawPlaceDto[];
}

export interface PlacesRequestFilters {
  municipality?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  hidden_gem?: boolean;
  family_friendly?: boolean;
  page?: number;
  limit?: number;
  q?: string;
}
