export const BRAND_COLOR = "#327F74";

export const getThemeColors = (darkMode: boolean) => {
  if (darkMode) {
    return {
      background: "#0B1211",
      card: "#111C1A",
      text: "#E5F2EF",
      textMuted: "#91A7A2",
      border: "#1F2C29",
      input: "#0F1917",
    };
  }

  return {
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#111827",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    input: "#F8FAFC",
  };
};
