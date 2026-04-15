import { APP_CONFIG } from "@/constants/app-config";
import type { PlacesRequestFilters } from "@/types/api";

const getBaseUrl = () => {
  const base = APP_CONFIG.apiBaseUrl.trim();
  return base.endsWith("/") ? base : `${base}/`;
};

const appendFilterValue = (searchParams: URLSearchParams, key: string, value: unknown) => {
  if (value == null || value === "") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendFilterValue(searchParams, key, item));
    return;
  }

  searchParams.append(key, String(value));
};

export const buildApiUrl = (path: string, params?: PlacesRequestFilters | Record<string, unknown>) => {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, getBaseUrl());

  if (params) {
    Object.entries(params).forEach(([key, value]) => appendFilterValue(url.searchParams, key, value));
  }

  return url.toString();
};

export const resolveApiAssetUrl = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiUrl = new URL(getBaseUrl());
  const rootPath = apiUrl.pathname.replace(/\/api\/v1\/?$/, "/");
  const rootUrl = new URL(rootPath, apiUrl.origin);

  return new URL(value.replace(/^\//, ""), rootUrl).toString();
};

const WIKI_COMMONS_RE = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//;
const WIKI_THUMB_RE = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)\d+px-(.+)$/;
const WIKI_FULL_RE = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)([0-9a-f]\/[0-9a-f]{2}\/)(.+)$/;

/**
 * Return a Wikipedia Commons thumbnail at the given width.
 * Works for both full-size and existing /thumb/ URLs.
 */
export const wikiThumb = (url: string | undefined, width: number): string | undefined => {
  if (!url || !WIKI_COMMONS_RE.test(url)) return url;

  const thumbMatch = url.match(WIKI_THUMB_RE);
  if (thumbMatch) {
    return `${thumbMatch[1]}${width}px-${thumbMatch[2]}`;
  }

  const fullMatch = url.match(WIKI_FULL_RE);
  if (fullMatch) {
    return `${fullMatch[1]}thumb/${fullMatch[2]}${fullMatch[3]}/${width}px-${fullMatch[3]}`;
  }

  return url;
};

export const getJson = async <T>(path: string, params?: PlacesRequestFilters | Record<string, unknown>) => {
  const response = await fetch(buildApiUrl(path, params), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Greška pri učitavanju podataka.");
  }

  return (await response.json()) as T;
};
