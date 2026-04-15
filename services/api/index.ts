import { APP_CONFIG } from "@/constants/app-config";
import { HttpPlacesApi } from "@/services/api/http-places-api";
import { MockPlacesApi } from "@/services/api/mock-places-api";
import type { PlacesApi } from "@/services/api/places-api";
import { SupabasePlacesApi } from "@/services/api/supabase-places-api";

/**
 * Client selection, in priority order:
 *   1. EXPO_PUBLIC_USE_MOCK_API=true  → bundled mock data (offline)
 *   2. EXPO_PUBLIC_SUPABASE_URL set   → Supabase (PostgREST + RPC)
 *   3. fallback                       → legacy HttpPlacesApi (FastAPI dev server)
 */
const pickClient = (): PlacesApi => {
  if (APP_CONFIG.useMockApi) {
    return new MockPlacesApi();
  }

  if (APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey) {
    return new SupabasePlacesApi();
  }

  return new HttpPlacesApi();
};

export const placesApi: PlacesApi = pickClient();
