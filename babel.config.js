module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Importa arquivos .md como string (ex.: docs/04-roadmap na Home).
    plugins: [["babel-plugin-inline-import", { extensions: [".md"] }]],
  };
};
