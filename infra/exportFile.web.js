/**
 * Entrega o arquivo da exportação no navegador (#429): baixa com o nome
 * pronto. Mesma assinatura do `exportFile.js`, que compartilha no celular.
 */

/**
 * @param {{nome: string, conteudo: string, mimeType: string}} arquivo
 * @returns {Promise<void>}
 */
export async function salvarECompartilhar({ nome, conteudo, mimeType }) {
  const blob = new Blob([conteudo], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Depois do clique: revogar antes cancelaria o download em alguns
    // navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
