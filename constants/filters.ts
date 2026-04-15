export type QuickFilterId =
  | "family"
  | "romantic"
  | "hidden"
  | "nightlife"
  | "sandy"
  | "rocky"
  | "culture"
  | "active-holiday"
  | "free-access"
  | "beach-club"
  | "parking-nearby";

export interface QuickFilterDef {
  id: QuickFilterId;
  label: string;
  labelKey: string;
  icon: string;
}

export const QUICK_FILTERS: QuickFilterDef[] = [
  { id: "family", label: "Porodica", labelKey: "filter_porodica", icon: "account-child" },
  { id: "romantic", label: "Romantično", labelKey: "filter_romanticno", icon: "heart-outline" },
  { id: "hidden", label: "Skriveno", labelKey: "filter_skriveno", icon: "diamond-stone" },
  { id: "nightlife", label: "Noćni život", labelKey: "filter_nocni_zivot", icon: "glass-cocktail" },
  { id: "sandy", label: "Pjeskovito", labelKey: "filter_pjeskovito", icon: "beach" },
  { id: "rocky", label: "Stjenovito", labelKey: "filter_stjenovito", icon: "terrain" },
  { id: "culture", label: "Kultura", labelKey: "filter_kultura", icon: "bank" },
  { id: "active-holiday", label: "Aktivni odmor", labelKey: "filter_aktivni_odmor", icon: "hiking" },
  { id: "free-access", label: "Slobodan pristup", labelKey: "filter_slobodan_pristup", icon: "gate-open" },
  { id: "beach-club", label: "Beach club", labelKey: "filter_beach_club", icon: "umbrella-beach-outline" },
  { id: "parking-nearby", label: "Parking", labelKey: "filter_parking", icon: "car" },
];

export const FILTER_LABELS: Record<string, string> = {
  family: "Porodica",
  romantic: "Romantično",
  hidden: "Skriveno",
  nightlife: "Noćni život",
  sandy: "Pjeskovito",
  rocky: "Stjenovito",
  culture: "Kultura",
  "active-holiday": "Aktivni odmor",
  "free-access": "Slobodan pristup",
  "beach-club": "Beach club",
  "parking-nearby": "Parking",
  "clean-water": "Čista voda",
  sunset: "Zalazak sunca",
  seafood: "Riba i morski plodovi",
  promenade: "Šetalište",
  viewpoint: "Vidikovac",
};
