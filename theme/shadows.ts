import { Platform } from "react-native";

type ShadowStyle = Record<string, unknown>;

/**
 * Cross-platform shadow helper.
 *
 * On web — emits `boxShadow` (modern CSS), avoiding the deprecated `shadow*`
 * React Native style props that React Native Web now warns about.
 *
 * On native — keeps legacy iOS `shadow*` props and Android `elevation`.
 */
const shadow = (
  webCss: string,
  native: { opacity: number; radius: number; offsetY: number; elevation: number }
): ShadowStyle =>
  Platform.OS === "web"
    ? { boxShadow: webCss }
    : {
        shadowColor: "#000000",
        shadowOpacity: native.opacity,
        shadowRadius: native.radius,
        shadowOffset: { width: 0, height: native.offsetY },
        elevation: native.elevation,
      };

// Airbnb three-layer shadow system: border ring + soft blur + primary lift
export const shadows = {
  soft: shadow(
    "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px",
    { opacity: 0.04, radius: 6, offsetY: 2, elevation: 2 }
  ),
  card: shadow(
    "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px",
    { opacity: 0.1, radius: 8, offsetY: 4, elevation: 4 }
  ),
  cardHover: shadow(
    "rgba(0,0,0,0.08) 0px 4px 12px",
    { opacity: 0.12, radius: 16, offsetY: 6, elevation: 8 }
  ),
} as const;
