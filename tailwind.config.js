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
        light: Colors.light,
        dark: Colors.dark,
      },
    },
  },
  plugins: [],
};
