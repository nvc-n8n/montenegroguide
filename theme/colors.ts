export const colors = {
  // Airbnb-inspired core surfaces
  page: "#ffffff",
  pageAlt: "#f7f7f7",
  card: "#ffffff",
  cardMuted: "#f7f7f7",

  // Borders
  border: "#dddddd",
  borderStrong: "#c1c1c1",

  // Text — warm near-black, never pure #000
  text: "#222222",
  textMuted: "#6a6a6a",
  textSoft: "#717171",

  // Rausch Red — singular brand accent
  accent: "#ff385c",
  accentStrong: "#e00b41",
  accentSoft: "#fff0f3",

  // Semantic
  sea: "#008489",
  seaSoft: "#e0f4f4",
  sand: "#c79542",
  success: "#008a05",
  danger: "#c13515",

  // Shadows & overlays
  shadow: "rgba(0,0,0,0.08)",
  overlay: "rgba(0,0,0,0.5)",
  overlayLight: "rgba(0,0,0,0.3)",
  overlayLoading: "rgba(0,0,0,0.06)",
  whiteOverlay: "rgba(255,255,255,0.16)",
  whiteOverlayMedium: "rgba(255,255,255,0.24)",
  whiteOverlayStrong: "rgba(255,255,255,0.92)",
  whiteOverlaySubtle: "rgba(255,255,255,0.4)",
  whiteOverlayText: "rgba(255,255,255,0.92)",
  whiteOverlayTextStrong: "rgba(255,255,255,0.96)",
  whiteOverlayTextMuted: "rgba(255,255,255,0.8)",
  whiteOverlayPill: "rgba(255,255,255,0.92)",
  pageAlpha: "rgba(255,255,255,0.97)",
  tabBar: "rgba(255,255,255,0.98)",

  // Category badge colors — Airbnb-style warm palette
  categoryBeach: { bg: "#e0f4f4", text: "#008489" },
  categoryNightlife: { bg: "#f3e8f9", text: "#7b2d8e" },
  categoryRestaurant: { bg: "#fff3e0", text: "#c67100" },
  categoryNature: { bg: "#e8f5e9", text: "#2e7d32" },
  categoryFortress: { bg: "#f5ebe0", text: "#8b5e34" },
  categoryMonastery: { bg: "#ede7f6", text: "#5e35b1" },
  categoryMuseum: { bg: "#e3f2fd", text: "#1565c0" },
  categoryActive: { bg: "#fff8e1", text: "#e65100" },
  categoryFamily: { bg: "#fce4ec", text: "#c62828" },
  categoryHidden: { bg: "#e0f2f1", text: "#00695c" },
  categoryLandmark: { bg: "#fbe9e7", text: "#bf360c" },
} as const;
