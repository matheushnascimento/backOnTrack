// Preset jest-expo: transforma RN/Expo, mocka os módulos nativos e usa o
// babel.config.js do projeto (babel-preset-expo). Ver M4 do roadmap (#134).
//
// tinybase só publica build ESM, e o jest precisa transpilá-lo. Em vez de
// reescrever o transformIgnorePatterns do jest-expo (e arriscar deixar de fora
// algo como expo-modules-core), pegamos o default dele e injetamos `tinybase`
// como 1ª exceção — robusto a mudanças futuras na lista.
const expoPreset = require("jest-expo/jest-preset");

const transformIgnorePatterns = expoPreset.transformIgnorePatterns.map((p) =>
  p.startsWith("/node_modules/(?!(")
    ? p.replace("/node_modules/(?!(", "/node_modules/(?!(tinybase|")
    : p,
);

module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns,
};
