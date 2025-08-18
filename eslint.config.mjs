import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  globalIgnores([
    "node_modules/",
    "node_modules/*",
    "dist/",
    "dist/*",
    ".expo/",
    ".expo/*",
    "*.config.*",
    ".vscode/",
  ]),
  {
    files: ["**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
]);
