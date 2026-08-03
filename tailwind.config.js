/** @type {import('tailwindcss').Config} */
const { Colors } = require("./constants/Colors");

module.exports = {
  content: ["app/**/*.*", "components/**/*.*"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: Colors.primary,
        secondary: Colors.secondary,
        danger: Colors.danger,
        light: Colors.light,
        dark: Colors.dark,
        // Tokens semânticos do design v2 (M5-B). Ver docs/09-design-v2.md.
        // Adicionados sem remover nada do M5 — telas antigas seguem com o
        // baseline; telas novas nascem consumindo estes.
        ink: "#0F1419",
        label: "#6B7280",
        "body-secondary": "#4B5563",
        "border-subtle": "#E5E7EB",
        "border-strong": "#D1D5DB",
        "surface-subtle": "#F3F4F6",
        "icon-dim": "#9CA3AF",
        "tint-blue": "#EAF3FB",
      },
      // Escala de tipografia canônica do M5 — px direto (não rem) pra não
      // depender de font-size base do html, que no bundle web tinha um truque
      // 62.5% inconsistente (§4 da auditoria) já removido. Valores mercado
      // (iOS body: 17pt) — ver docs/08-design-tokens.md.
      fontSize: {
        xs: "13px",
        sm: "15px",
        base: "17px",
        lg: "19px",
        xl: "22px",
        "2xl": "28px",
      },
    },
  },
  plugins: [],
};
