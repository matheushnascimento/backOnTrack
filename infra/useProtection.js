// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo

/**
 * Proteção dos dados sensíveis neste aparelho (#388, fatia 2 da #374).
 *
 * Junta as três peças: os pacotes de chave (tabela `e2eKeys`, sincronizada),
 * o cofre do aparelho (`e2eVault`) e a regra (`constants/e2eKeyring.js`).
 *
 * As chaves destrancadas ficam num estado de módulo compartilhado, e não num
 * `useState` por tela: destrancar na tela de proteção tem que destrancar
 * também a tela do autocuidado que estiver aberta por baixo.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useTable } from "tinybase/ui-react";

import { createKeyBundle, rewrapPassword } from "@/constants/e2e";
import {
  bundlesDaTabela,
  destrancarComCodigo,
  destrancarTodas,
  lerChaves,
  pacotePrincipal,
  podeCriar,
  serializarChaves,
  statusDaProtecao,
} from "@/constants/e2eKeyring";

import { addKeyBundle, store, updateKeyBundle } from "./database";
import { apagarCofre, gravarCofre, lerCofre } from "./e2eVault";
import { useSession } from "./session";
import { SYNC_ONLINE, useSyncStatus } from "./sync";

// --- estado compartilhado ----------------------------------------------------

const SEM_CHAVES = Object.freeze({});
let atual = { conta: null, chaves: SEM_CHAVES };
const ouvintes = new Set();

function publicar(proximo) {
  atual = proximo;
  for (const fn of ouvintes) fn();
}

function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

async function guardar(conta, chaves) {
  await gravarCofre(conta, serializarChaves(chaves));
  publicar({ conta, chaves });
}

// --- hook --------------------------------------------------------------------

/**
 * @returns {{
 *   status: "sem-protecao"|"travado"|"destravado",
 *   criacao: {ok: boolean, motivo: null|"ja-existe"|"sem-login"|"sem-sync"},
 *   chaves: Record<string, Uint8Array>,
 *   principal: {kid: string, bundle: object}|null,
 *   criar: (senha: string) => Promise<string>,
 *   destravar: (senha: string) => Promise<void>,
 *   recuperar: (codigo: string, novaSenha: string) => Promise<void>,
 *   trocarSenha: (atual: string, nova: string) => Promise<void>,
 *   travar: () => Promise<void>,
 * }}
 */
/**
 * As chaves destrancadas neste aparelho, pra quem só precisa LER.
 *
 * Mais leve que o `useProtection`: não olha a tabela de pacotes nem o sync.
 * É o que cada cartão do histórico usa pra decifrar o próprio registro.
 *
 * @returns {Record<string, Uint8Array>} `kid` → chave de dados
 */
export function useChaves() {
  const { user } = useSession();
  const conta = user?.id ?? "local";
  const estado = useSyncExternalStore(assinar, () => atual);

  // Carrega o cofre da conta. Trocar de conta troca as chaves. O estado é de
  // módulo, então só o primeiro componente montado de fato lê o cofre.
  useEffect(() => {
    if (atual.conta === conta) return;
    let vivo = true;
    lerCofre(conta)
      .then((json) => {
        if (vivo) publicar({ conta, chaves: lerChaves(json) });
      })
      .catch(() => {
        if (vivo) publicar({ conta, chaves: SEM_CHAVES });
      });
    return () => {
      vivo = false;
    };
  }, [conta]);

  // Memorizado: um `{}` novo a cada render invalidaria quem depende dele.
  return useMemo(
    () => (estado.conta === conta ? estado.chaves : SEM_CHAVES),
    [estado, conta],
  );
}

export function useProtection() {
  const tabela = useTable("e2eKeys", store);
  const bundles = useMemo(() => bundlesDaTabela(tabela), [tabela]);
  const { user } = useSession();
  const { status: sync } = useSyncStatus();
  const conta = user?.id ?? "local";
  const chaves = useChaves();

  const criacao = podeCriar({
    bundles,
    logado: Boolean(user),
    syncOnline: sync === SYNC_ONLINE,
  });

  const criar = useCallback(
    async (senha) => {
      // Reconfere na hora: o estado da tela pode estar velho.
      if (!criacao.ok) throw new Error(`não pode criar: ${criacao.motivo}`);
      const { bundle, dataKey, recoveryCode } = await createKeyBundle(senha);
      addKeyBundle(bundle);
      await guardar(conta, { ...chaves, [bundle.kid]: dataKey });
      return recoveryCode;
    },
    [criacao.ok, criacao.motivo, conta, chaves],
  );

  const destravar = useCallback(
    async (senha) => {
      const abertas = await destrancarTodas(bundles, senha);
      await guardar(conta, { ...chaves, ...abertas });
    },
    [bundles, conta, chaves],
  );

  const recuperar = useCallback(
    async (codigo, novaSenha) => {
      // O código é de um pacote só. Ele ganha a senha nova; os outros, se
      // houver, seguem com a senha antiga até a próxima troca de senha.
      const { bundle, kid, dataKey } = await destrancarComCodigo(
        bundles,
        codigo,
      );
      updateKeyBundle(await rewrapPassword(bundle, dataKey, novaSenha));
      await guardar(conta, { ...chaves, [kid]: dataKey });
    },
    [bundles, conta, chaves],
  );

  const trocarSenha = useCallback(
    async (senhaAtual, nova) => {
      // Pede a atual de novo, como o Bitwarden: aparelho destravado na mão de
      // outra pessoa não basta pra trocar a senha.
      const abertas = await destrancarTodas(bundles, senhaAtual);
      for (const { kid, bundle } of bundles) {
        if (abertas[kid]) {
          updateKeyBundle(await rewrapPassword(bundle, abertas[kid], nova));
        }
      }
      await guardar(conta, { ...chaves, ...abertas });
    },
    [bundles, conta, chaves],
  );

  const travar = useCallback(async () => {
    await apagarCofre(conta);
    publicar({ conta, chaves: {} });
  }, [conta]);

  return {
    status: statusDaProtecao({ bundles, chaves }),
    criacao,
    chaves,
    principal: pacotePrincipal(bundles),
    criar,
    destravar,
    recuperar,
    trocarSenha,
    travar,
  };
}
