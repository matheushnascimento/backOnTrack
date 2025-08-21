/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["app/**/*.*", "components/**/*.*"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        light: {
          background: "#F8F9FA",
          text: "#333333",
          outerText: "#F8F9FA",
          backgroundCard: "rgba(255, 255, 255, 0.15)",
        },
        dark: {
          background: "#333333",
          text: "#F8F9FA",
          outerText: "#333333",
          backgroundCard: "rgba(255, 255, 255, 0.15)",
        },
      },
    },
  },
  plugins: [],
};
