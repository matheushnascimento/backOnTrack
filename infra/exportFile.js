/**
 * Entrega o arquivo da exportação no celular (#429).
 *
 * Grava no cache do app e abre o compartilhamento do sistema, de onde a
 * pessoa manda pro Drive, pro e-mail ou pra pasta que quiser. O cache basta:
 * o arquivo só precisa existir até o compartilhamento copiá-lo, e o sistema
 * limpa depois. Na web o par é `exportFile.web.js`, que baixa.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * @param {{nome: string, conteudo: string, mimeType: string}} arquivo
 * @returns {Promise<void>}
 */
export async function salvarECompartilhar({ nome, conteudo, mimeType }) {
  if (!(await Sharing.isAvailableAsync())) {
    const erro = /** @type {Error & {code?: string}} */ (
      new Error("compartilhamento indisponível")
    );
    erro.code = "sem-compartilhar";
    throw erro;
  }
  const arquivo = new File(Paths.cache, nome);
  arquivo.create({ overwrite: true });
  arquivo.write(conteudo);
  await Sharing.shareAsync(arquivo.uri, {
    mimeType,
    dialogTitle: "Exportar dados",
  });
}
