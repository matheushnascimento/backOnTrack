export const Colors = {
  primary: "#2E5A88",
  secondary: "#4CAF50",
  // Ação destrutiva e erro visível — Material red-500, combina com o
  // secondary que é Material green-500. Ver docs/08-design-tokens.md.
  danger: "#F44336",
  light: {
    background: "#F8F9FA",
    text: "#333333",
    outerText: "#F8F9FA",
    // Véu escuro (simétrico ao branco do dark): cards/inputs ficam
    // visíveis sobre o fundo claro em vez de sumir (branco sobre branco).
    backgroundCard: "rgba(0, 0, 0, 0.08)",
  },
  dark: {
    background: "#333333",
    text: "#F8F9FA",
    outerText: "#333333",
    backgroundCard: "rgba(255, 255, 255, 0.15)",
  },
};

export const shadow = {
  elevation: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
};
