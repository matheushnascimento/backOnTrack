// Versão web do cofre: SÓ memória (#388).
//
// O navegador não tem cofre do sistema, e guardar a chave no localStorage
// deixaria ela legível pra qualquer script da página e pra quem abrir o
// navegador. Na memória, ela some ao fechar ou recarregar a aba, e a próxima
// sessão pede a senha de novo. O site é superfície de conferência, não de uso
// diário, então o custo é aceitável.

const memoria = new Map();

/** @param {string} conta */
export async function lerCofre(conta) {
  return memoria.get(conta) ?? null;
}

/**
 * @param {string} conta
 * @param {string} json
 */
export async function gravarCofre(conta, json) {
  memoria.set(conta, json);
}

/** @param {string} conta */
export async function apagarCofre(conta) {
  memoria.delete(conta);
}
