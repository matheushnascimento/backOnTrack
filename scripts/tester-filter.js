// Restringe a lista de testers aos nomes pedidos (#372).
//
// Existe pra mandar o anúncio de uma versão só pra quem entrou depois dele,
// sem reenviar pra todo mundo. Em CommonJS e fora do `notify-testers.mjs` pelo
// mesmo motivo do `check-em-dash.js`: o jest importa direto, e o script de
// envio tem `await` no topo, que não dá pra importar num teste.

/**
 * Minúsculas e sem acento: "Thalita" casa com "thalita" e "Gleicy" com "gléicy".
 * @param {unknown} nome
 */
function normalizar(nome) {
  return String(nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Os testers cujo nome está em `pedido`, ou a lista inteira sem pedido.
 *
 * Nome pedido que não existe é ERRO, e não filtro vazio. Errar uma letra e
 * mandar pra ninguém em silêncio é ruim; cair no padrão e mandar pra todo mundo
 * é pior, porque mensagem enviada não volta.
 *
 * @param {{name: string, phone: string}[]} testers
 * @param {string|undefined} pedido nomes separados por vírgula
 * @returns {{testers: {name: string, phone: string}[], faltando: string[]}}
 *   `faltando` não vazio significa que o envio deve abortar
 */
function filtrarTesters(testers, pedido) {
  if (pedido == null) return { testers, faltando: [] };
  const nomes = String(pedido).split(",").map(normalizar).filter(Boolean);
  if (nomes.length === 0) return { testers: [], faltando: [String(pedido)] };

  const porNome = new Map(testers.map((t) => [normalizar(t.name), t]));
  const faltando = nomes.filter((n) => !porNome.has(n));
  const escolhidos = testers.filter((t) => nomes.includes(normalizar(t.name)));
  return { testers: escolhidos, faltando };
}

module.exports = { filtrarTesters };
