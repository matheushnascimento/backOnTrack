import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

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
    // O código do app é .jsx (as telas/componentes) + .js (constants/infra).
    // Antes o eslint só cobria **/*.js, e como o app é todo .jsx ele não lintava
    // NADA, e foi por isso que um `setTick` inexistente foi parar em produção
    // (#126). Cobrir .jsx com no-undef como erro fecha essa cegueira (#128).
    files: ["**/*.{js,jsx}"],
    plugins: { js, "react-hooks": reactHooks },
    extends: ["js/recommended"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      // RN/web: console, fetch, setTimeout, globalThis, navigator… vêm daqui.
      // process (1 arquivo) fica no `/* global process */` inline dele.
      globals: globals.browser,
    },
    rules: {
      "no-unused-vars": "warn",
      // Erro (não warn): é o que faz um no-undef como o do #126 quebrar o CI.
      "no-undef": "error",
      // O código já trazia um disable de exhaustive-deps sem o plugin instalado
      // A intenção sempre foi ter o react-hooks ligado.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
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
    // Tooling de repo (scripts/) roda em Node CommonJS, fora do bundle do app.
    // Mesmo caso do plugins/ acima: precisa dos globals de Node (require,
    // module, process) que o bloco do app não tem.
    files: ["scripts/**/*.js"],
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
  {
    // Server WS de sync do M6 (server/): Node ESM, fora do bundle do app.
    files: ["server/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    // Testes (jest): globals describe/test/expect/…; e os callbacks de
    // renderHook chamam hooks fora de componente de propósito.
    files: ["tests/**/*.{js,jsx}"],
    languageOptions: {
      // browser (fetch/navigator) + node (process/global) + jest.
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);
