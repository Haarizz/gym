export const BRAND_COLOR = "#327F74";

export const getThemeColors = (darkMode: boolean) => {
  if (darkMode) {
    return {
      background: "#08110F",
      card: "#111C1A",
      text: "#E5F2EF",
      textMuted: "#91A7A2",
      border: "rgba(160, 193, 185, 0.18)",
      input: "rgba(12, 25, 22, 0.72)",
      glass: "rgba(16, 28, 25, 0.62)",
      glassStrong: "rgba(12, 23, 20, 0.8)",
      blurTint: "dark" as const,
      blobOne: "rgba(50, 127, 116, 0.22)",
      blobTwo: "rgba(59, 130, 246, 0.18)",
      shadow: "#000000",
      isDark: true,
    };
  }

  return {
    background: "#EEF5F3",
    card: "#FFFFFF",
    text: "#111827",
    textMuted: "#6B7280",
    border: "rgba(255, 255, 255, 0.55)",
    input: "rgba(255, 255, 255, 0.56)",
    glass: "rgba(255, 255, 255, 0.44)",
    glassStrong: "rgba(255, 255, 255, 0.68)",
    blurTint: "light" as const,
    blobOne: "rgba(50, 127, 116, 0.2)",
    blobTwo: "rgba(99, 102, 241, 0.12)",
    shadow: "rgba(15, 23, 42, 0.18)",
    isDark: false,
  };
};
