// @ts-nocheck -- apoio de teste; globals do jest não são tipados (ADR-002)
//
// Sobe o server de sync em subprocesso, para as duas suítes que precisam dele.
//
// Existe por causa do #342: a lógica estava duplicada em
// `sync-server.test.js` e `sync-server-auth.test.js`, e as cópias divergiram.
// Uma sorteava porta em [40000, 50000) e a outra em [41000, 61000), faixas que
// se cruzam. O jest roda suítes em paralelo, a de auth sobe cerca de dez
// servers, e colisão vira `EADDRINUSE`, que derruba o processo com código 1.
// Era exatamente a mensagem da falha intermitente.
//
// ## Porta 0 em vez de sorteio
//
// Pedir `PORT=0` faz o SO entregar uma porta livre, o que **elimina** a
// colisão em vez de deixá-la improvável. O número real sai do log de boot, que
// as duas suítes já esperavam de qualquer forma.
//
// ## Por que o stderr importa
//
// A rejeição antiga dizia só `server exited early with code 1` e jogava fora o
// que o subprocesso escreveu. Sem isso não dá pra separar colisão de porta,
// dependência faltando no runner, e erro real de boot. Agora a mensagem
// carrega as duas saídas.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SERVER_JS = resolve(__dirname, "..", "..", "server", "server.js");
const PRONTO = /\[sync] listening on ws:\/\/[^\s:]+:(\d+)/;

/**
 * Sobe o server e espera ele estar ouvindo.
 *
 * @param {object} [extraEnv] Env extra (`AUTH_MODE`, `SUPABASE_URL`, ...).
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{port: number, dataDir: string, child: object}>}
 */
export async function startSyncServer(
  extraEnv = {},
  { timeoutMs = 10_000 } = {},
) {
  const dataDir = mkdtempSync(join(tmpdir(), "sync-test-"));
  const child = spawn("node", [SERVER_JS], {
    // PORT=0: o SO escolhe. `extraEnv` vem depois pra um teste poder fixar a
    // porta se algum dia precisar.
    env: { ...process.env, PORT: "0", DATA_DIR: dataDir, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Acumular em vez de olhar chunk a chunk: a linha de boot pode chegar
  // partida em dois pedaços, e aí o `includes` de cada chunk nunca casa. Isso
  // produziria "não subiu em 5s" mesmo com o server de pé.
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (b) => {
    stdout += String(b);
  });
  child.stderr.on("data", (b) => {
    stderr += String(b);
  });

  const port = await new Promise((cumprir, rejeitar) => {
    const comSaidas = (motivo) =>
      new Error(
        `${motivo}\n--- stdout ---\n${stdout || "(vazio)"}\n--- stderr ---\n${stderr || "(vazio)"}`,
      );
    const timer = setTimeout(() => {
      limpar();
      rejeitar(comSaidas(`server não subiu em ${timeoutMs}ms`));
    }, timeoutMs);

    const tentar = () => {
      const m = PRONTO.exec(stdout);
      if (!m) return;
      limpar();
      cumprir(Number(m[1]));
    };
    const aoSair = (code) => {
      limpar();
      rejeitar(comSaidas(`server saiu antes de subir, código ${code}`));
    };
    function limpar() {
      clearTimeout(timer);
      child.stdout.off("data", tentar);
      child.off("exit", aoSair);
    }

    child.stdout.on("data", tentar);
    child.on("exit", aoSair);
    // A linha pode ter chegado antes destes listeners entrarem.
    tentar();
  }).catch((e) => {
    child.kill("SIGKILL");
    rmSync(dataDir, { recursive: true, force: true });
    throw e;
  });

  return { port, dataDir, child };
}

/**
 * Derruba o server e apaga o tmpdir.
 *
 * @param {{child: object, dataDir?: string}} servidor
 */
export async function stopSyncServer({ child, dataDir }) {
  if (child && !child.killed) {
    child.kill("SIGTERM");
    // SIGKILL de reserva: um server travado não pode segurar a suíte.
    await new Promise((pronto) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        pronto();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(t);
        pronto();
      });
    });
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}
