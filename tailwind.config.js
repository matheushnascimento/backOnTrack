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
