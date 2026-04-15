export const APP_CONFIG = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000/api/v1",
  useMockApi: (process.env.EXPO_PUBLIC_USE_MOCK_API ?? "false").toLowerCase() === "true",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
  mockLatencyMs: 280,
  pageSize: 8,
} as const;
