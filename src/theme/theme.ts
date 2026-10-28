export const palette = {
  // Identité BAC Madagascar (drapeau : vert, rouge, jaune)
  vert: "#0B3D2E",
  vertClair: "#1F8A66",
  rouge: "#C8102E",
  jaune: "#F2B705",

  // Surfaces claires étagées
  fond: "#F2F4F1",
  carte: "#FFFFFF",
  texte: "#151A17",
  texteSecondaire: "#667069",
  bordure: "#E3E7E2",
  danger: "#C8102E",

  // Extras premium
  iconeFond: "rgba(11,61,46,0.10)",
  vertFonce: "#08291F",
};

export const darkPalette = {
  vert: "#12362A",
  vertClair: "#2FBF87",
  rouge: "#E4405F",
  jaune: "#F2B705",

  // Surfaces sombres étagées
  fond: "#0C0F0D",
  carte: "#161B17",
  texte: "#ECEFEA",
  texteSecondaire: "#98A29A",
  bordure: "#272F29",
  danger: "#E4405F",

  // Extras premium
  iconeFond: "rgba(47,191,135,0.14)",
  vertFonce: "#071E16",
};

export type ThemeColors = typeof palette;

export const theme = (dark: boolean) => {
  const c = dark ? darkPalette : palette;
  // Ombre portée discrète (mode clair uniquement : en sombre, les bordures suffisent)
  const ombre = dark
    ? {}
    : {
        shadowColor: "#0B3D2E",
        shadowOpacity: 0.07,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      };
  return {
    dark,
    colors: c,
    ombre,
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { sm: 8, md: 14, lg: 18, full: 999 },
    card: {
      backgroundColor: c.carte,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.bordure,
      padding: 14,
    },
    badge: {
      backgroundColor: c.vert,
      color: "#FFFFFF",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontSize: 12,
      fontWeight: "600" as const,
      overflow: "hidden" as const,
    },
  };
};

export type Theme = ReturnType<typeof theme>;
