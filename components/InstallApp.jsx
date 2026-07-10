// Card "Obter o app" — versão nativa (no-op).
//
// A obtenção do APK só faz sentido na web: quem já está no app nativo não
// precisa baixá-lo. O Metro resolve InstallApp.web.jsx no bundle web e este
// arquivo no nativo, então o card simplesmente não existe fora da web — sem
// espalhar checagens de Platform.OS pela árvore. Mesmo padrão de
// infra/persistence.js vs infra/persistence.web.js.

export default function InstallApp() {
  return null;
}
