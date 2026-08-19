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
        // Adicionados sem remover nada do M5, e telas antigas seguem com o
        // baseline; telas novas nascem consumindo estes.
        ink: "#0F1419",
        label: "#6B7280",
        "body-secondary": "#4B5563",
        "border-subtle": "#E5E7EB",
        "border-strong": "#D1D5DB",
        "surface-subtle": "#F3F4F6",
        "icon-dim": "#9CA3AF",
        "tint-blue": "#EAF3FB",
        "tint-red": "#FEF3F2",
        "tint-green": "#F0FDF4",
        "tint-yellow": "#FFFBEB",
        // Contrapartes dark do design v2 (M5-B Turno 3). Regras:
        // near-black quente (#12161B), NUNCA preto puro. Elevação por
        // luminância, não sombra: card = app + 4L, subtle = app + 8L.
        // Brand desloca +25L (2E5A88 → 5B8FC7), texto sobre brand vira ink.
        // Verde "hoje" +6L (4CAF50 → 5FC463). Tints são versões dessaturadas
        // do próprio hue sobre bg. Bordas obrigatórias em todo card no dark
        // (ausência de borda faz card desaparecer).
        "app-dark": "#12161B",
        "card-dark": "#1A1F26",
        "ink-dark": "#ECEEF1",
        "label-dark": "#7C8592",
        "body-secondary-dark": "#A8AFB8",
        "border-subtle-dark": "#2A303A",
        "border-strong-dark": "#3A4250",
        "surface-subtle-dark": "#232932",
        "icon-dim-dark": "#7C8592",
        "tint-blue-dark": "#1E2A38",
        "tint-red-dark": "#332020",
        "tint-green-dark": "#1C2A22",
        "tint-yellow-dark": "#2F2A1A",
        "primary-dark": "#5B8FC7",
        "on-primary-dark": "#0F1419",
        "secondary-dark": "#5FC463",
      },
      // Escala de tipografia canônica do M5: px direto (não rem) pra não
      // depender de font-size base do html, que no bundle web tinha um truque
      // 62.5% inconsistente (§4 da auditoria) já removido. Valores mercado
      // (iOS body: 17pt). Ver docs/08-design-tokens.md.
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
