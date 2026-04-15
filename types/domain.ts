export interface GuideImage {
  url: string;
  thumbUrl?: string;
  alt: string;
  licenseLabel?: string;
  credit?: string;
}

export interface PlaceCoordinates {
  lat: number;
  lng: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  placeCount: number;
  coverImageUrl?: string;
  coverThumbUrl?: string;
}

export interface Municipality {
  id: string;
  slug: string;
  name: string;
  region: string;
  shortDescription: string;
  heroImageUrl?: string;
  placeCount: number;
  palette: {
    accent: string;
    accentSoft: string;
    shell: string;
    overlay: string;
    eyebrow: string;
  };
}

export interface Place {
  id: string;
  slug: string;
  name: string;
  alternateNames: string[];
  municipalityName: string;
  municipalitySlug: string;
  categoryName: string;
  categorySlug: string;
  subtype?: string;
  coordinates?: PlaceCoordinates;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  amenities: string[];
  bestFor: string[];
  images: GuideImage[];
  featured: boolean;
  familyFriendly: boolean;
  hiddenGem: boolean;
  nightlife: boolean;
  activeHoliday: boolean;
  culturalSite: boolean;
  beachType?: string;
  parkingAvailable: boolean;
  petFriendly: boolean;
  accessibilityNotes?: string;
  popularityScore: number;
  distanceKm?: number;
}

export interface FeaturedContent {
  municipality: Municipality | null;
  beaches: Place[];
  attractions: Place[];
  tasteAndNightlife: Place[];
  activeEscapes: Place[];
}

export interface MunicipalityOverview {
  municipality: Municipality;
  categories: Category[];
  featuredPlaces: Place[];
}

export interface PlacesListResponse {
  items: Place[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}
