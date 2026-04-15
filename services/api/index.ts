import { APP_CONFIG } from "@/constants/app-config";
import { HttpPlacesApi } from "@/services/api/http-places-api";
import { MockPlacesApi } from "@/services/api/mock-places-api";

export const placesApi = APP_CONFIG.useMockApi ? new MockPlacesApi() : new HttpPlacesApi();
