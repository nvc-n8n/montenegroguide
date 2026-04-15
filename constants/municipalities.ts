export const MUNICIPALITY_META = {
  "herceg-novi": {
    accent: "#008489",
    accentSoft: "#e0f4f4",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.45)",
    eyebrow: "Mimo gužve",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/PanoramaHercegNovi.JPG/1280px-PanoramaHercegNovi.JPG",
  },
  kotor: {
    accent: "#484848",
    accentSoft: "#f2f2f2",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.48)",
    eyebrow: "Kamen i more",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/View_of_Kotor_bay_and_old_town.jpg/1280px-View_of_Kotor_bay_and_old_town.jpg",
  },
  tivat: {
    accent: "#008489",
    accentSoft: "#e0f4f4",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.42)",
    eyebrow: "Lagan ritam",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Tivat_-_Marina_Porto_Montenegro_-_panoramio.jpg/1280px-Tivat_-_Marina_Porto_Montenegro_-_panoramio.jpg",
  },
  budva: {
    accent: "#ff385c",
    accentSoft: "#fff0f3",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.46)",
    eyebrow: "Energija obale",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Crkva%2C_Stari_Grad_00585.jpg/1280px-Crkva%2C_Stari_Grad_00585.jpg",
  },
  bar: {
    accent: "#c79542",
    accentSoft: "#fdf6ec",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.44)",
    eyebrow: "Sunce i istorija",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Ruins_Stari_Bar_Montenegro.jpg/1280px-Ruins_Stari_Bar_Montenegro.jpg",
  },
  ulcinj: {
    accent: "#008a05",
    accentSoft: "#e8f5e9",
    shell: "#f7f7f7",
    overlay: "rgba(0,0,0,0.42)",
    eyebrow: "Južni temperament",
    heroFallback: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Ulcinj_Old_Town%2C_August_2012.jpg/1280px-Ulcinj_Old_Town%2C_August_2012.jpg",
  },
} as const;

export const MUNICIPALITY_ORDER = [
  "herceg-novi",
  "kotor",
  "tivat",
  "budva",
  "bar",
  "ulcinj",
] as const;
