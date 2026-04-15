import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "@/constants/app-config";

let cachedClient: SupabaseClient | null = null;

/**
 * Lazy singleton so the client is constructed once and reused across features.
 * Reads credentials from APP_CONFIG (populated at build time from EXPO_PUBLIC_*).
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseAnonKey) {
    throw new Error(
      "Supabase credentials missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedClient = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    auth: {
      // This app has no auth yet; we only need the anon key for public data.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
};
