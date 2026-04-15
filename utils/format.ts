import type { Place } from "@/types/domain";
import { FILTER_LABELS } from "@/constants/filters";

export const titleCase = (value: string) =>
  value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const formatTagLabel = (tag: string) => FILTER_LABELS[tag] ?? titleCase(tag);

export const formatCoordinates = (place: Place) => {
  if (!place.coordinates) {
    return "Koordinate nijesu dostupne";
  }

  return `${place.coordinates.lat.toFixed(3)}, ${place.coordinates.lng.toFixed(3)}`;
};

export const formatDistance = (distanceKm?: number) => {
  if (typeof distanceKm !== "number") {
    return null;
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};
