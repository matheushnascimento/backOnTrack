/** @type {import('tailwindcss').Config} */
const { Colors } = require("./constants/Colors");

module.exports = {
  content: ["app/**/*.*", "components/**/*.*"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        light: Colors.light,
        dark: Colors.dark,
      },
    },
  },
  plugins: [],
};
