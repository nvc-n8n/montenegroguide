// Airbnb uses Cereal VF — Nunito is the closest Google Font with
// the same warm, rounded terminals. Use it for ALL text (no serif split).
export const typography = {
  // Keep serif keys so existing references work, but map to Nunito
  serif: {
    semiBold: "Nunito_600SemiBold",
    bold: "Nunito_700Bold",
  },
  sans: {
    regular: "Nunito_400Regular",
    medium: "Nunito_500Medium",
    semiBold: "Nunito_600SemiBold",
    bold: "Nunito_700Bold",
  },
} as const;
