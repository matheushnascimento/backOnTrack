import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

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
  {
    // Config plugins do Expo são tooling Node (CommonJS), não código do app.
    files: ["plugins/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    // Funções serverless (Vercel) rodam em Node (ESM), não no app.
    files: ["api/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
  },
]);
