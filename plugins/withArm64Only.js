// Limita as arquiteturas nativas do build Android a arm64-v8a (issue #87).
//
// O APK do perfil `preview` era "universal": empacotava libs nativas de 4
// arquiteturas (arm64-v8a + armeabi-v7a + x86 + x86_64 = 114 MB). x86/x86_64 só
// servem emulador e armeabi-v7a só celular 32-bit antigo, peso morto que fazia
// o download travar no celular dos testers.
//
// Fixar `reactNativeArchitectures=arm64-v8a` no gradle.properties faz o
// gradle-plugin do React Native aplicar `ndk.abiFilters` (NdkConfiguratorUtils.kt)
// e gerar um APK só arm64 (~40 MB), que cobre a maioria esmagadora dos aparelhos
// (2017+). Roda no prebuild do EAS.

const { withGradleProperties } = require("@expo/config-plugins");

const KEY = "reactNativeArchitectures";
const VALUE = "arm64-v8a";

module.exports = function withArm64Only(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter(
      (item) => !(item.type === "property" && item.key === KEY),
    );
    cfg.modResults.push({ type: "property", key: KEY, value: VALUE });
    return cfg;
  });
};
