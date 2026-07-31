// Fonte única das URLs de distribuição do app.
//
// EAS_INSTALL_URL: página de instalação interna do build EAS. É o que o card
// "Obter o app" usa, porque o Chrome do Android BLOQUEIA o download direto de
// APK de URL pública (o Safe Browsing baixa 100% e descarta o arquivo); a
// página do EAS instala mesmo no Chrome (testado deslogado, em aba anônima).
// É POR BUILD — trocar a cada build NATIVO novo (raro: o OTA cobre mudanças de
// JS). Ver issue #90.
//
// APK_URL: download direto do APK via GitHub Releases (/latest/, estável).
// Mantido como arquivo/histórico e fallback (funciona em Firefox/Samsung
// Internet, mas trava no Chrome). Ciclo 3, #74.

export const EAS_INSTALL_URL =
  "https://expo.dev/accounts/matheushnascimento/projects/backOnTrack/builds/2e4d014d-d558-4c6d-9d75-0d2c2be81870";

export const APK_URL =
  "https://github.com/matheushnascimento/backOnTrack/releases/latest/download/backOnTrack.apk";
