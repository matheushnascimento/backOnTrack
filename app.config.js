// Variante de app por ambiente.
//
// O `app.json` continua sendo a fonte de verdade da config, e o Expo o carrega
// primeiro e entrega o resultado aqui como `config`. Este arquivo só BIFURCA
// a identidade quando `APP_VARIANT=staging` (setado pelo profile `staging` do
// eas.json).
//
// ## Por que uma identidade separada
//
// O APK de staging precisa conviver com o de produção NO MESMO aparelho, e é
// isso que permite validar uma mudança nativa antes dela chegar nos testers.
// Dois apps só coexistem no Android se tiverem `applicationId` diferente.
//
// O `scheme` também bifurca, e não é detalhe: com os dois instalados sob o
// mesmo `backontrack://`, o Android não sabe qual abrir no callback do magic
// link, e o login cairia no app errado (ou num seletor). Ver
// docs/10-canais-e-promocao.md § Supabase.
//
// O que NÃO muda: `slug`, `extra.eas.projectId` e `updates.url`. Os dois
// variantes são o mesmo projeto EAS e batem no mesmo servidor de update; o
// que os separa é o CANAL (`preview` vs `staging`), definido no eas.json.

const IS_STAGING = process.env.APP_VARIANT === "staging";

module.exports = ({ config }) => {
  if (!IS_STAGING) return config;

  return {
    ...config,
    name: "BoT staging",
    scheme: "backontrack-staging",
    android: {
      ...config.android,
      package: `${config.android.package}.staging`,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}.staging`,
    },
  };
};
