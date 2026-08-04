// Notificar Testers (Ciclo 5 #78; modo de envio no Track A do M3-5, #111).
//
// Monta a mensagem (da release mais recente, ou de um arquivo) e imprime ou
// envia pros testers.
//
//   npm run notify:testers        -> só imprime e copia pro clipboard (padrão)
//   npm run notify:testers:send   -> ENVIA de verdade, via Evolution API
//
// Por padrão a mensagem é o anúncio da última release (via `gh`). Nem toda
// notificação é anúncio de versão: quando as novidades já chegaram por OTA, o
// texto certo é outro (ex: convite pro dogfooding, pedindo feedback). Pra esses
// casos, passe um arquivo:
//
//   node scripts/notify-testers.mjs --send --text-file caminho/msg.txt
//
// O envio é opt-in porque manda mensagem real e irreversível pros testers. Não
// existe lista de transmissão via API (a Evolution API não suporta: issue #2081),
// então o disparo é um DM por tester, em loop e com delay — o que também é mais
// privado (ninguém vê a lista) e menos chamativo pro antispam do WhatsApp.
//
// Env do modo --send:
//   EVO_URL       ex: http://localhost:8085
//   EVO_INSTANCE  nome da instância (ex: "Back on Track"); é URL-encoded aqui
//   EVO_APIKEY    AUTHENTICATION_API_KEY da Evolution API
//   EVO_DELAY_MS  opcional, delay entre envios (default 4000)
//
// A lista sai da tela de admin do app ("Exportar lista") e vai em
// scripts/testers.json — gitignored, porque é PII.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTERS_FILE = join(ROOT, "scripts", "testers.json");
const DEFAULT_DELAY_MS = 4000;

/** @param {string} msg */
function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function readHomepage() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  if (!pkg.homepage) {
    fail("package.json não tem o campo 'homepage' (URL pública da Home).");
  }
  return pkg.homepage;
}

function readLatestRelease() {
  try {
    const out = execFileSync(
      "gh",
      ["release", "view", "--json", "tagName,body"],
      {
        cwd: ROOT,
        encoding: "utf8",
      },
    );
    return JSON.parse(out);
  } catch {
    fail(
      "não consegui ler a release mais recente via 'gh'. Confira se o gh está " +
        "instalado, autenticado, e se há releases publicadas.",
    );
  }
}

/**
 * Monta a mensagem WhatsApp de aviso de nova APK. Tom comercial e enxuto: o
 * tester decide em segundos se instala agora ou depois — não é changelog de
 * dev. As **notas da release** (`-f notes=` no workflow) viram o "o que
 * mudou" — escreva user-facing (features/fixes visíveis), não dev-facing
 * (SDK bumps, refactors internos). A versão fica no rodapé pra referência,
 * sem competir com a headline.
 *
 * Formatação WhatsApp: `*bold*` e `_italic_` renderizam no cliente.
 *
 * @param {{ tagName: string, body?: string | null }} release
 * @param {string} homepage
 * @returns {string}
 */
function buildMessage({ tagName, body }, homepage) {
  const novidades = (body ?? "").trim();
  const linhas = ["✨ *Back on Track* atualizou", ""];
  if (novidades) linhas.push(novidades, "");
  linhas.push(
    "📲 *Baixar aqui:*",
    homepage,
    "",
    'Toque em "Obter o app" → botão de instalação. Seus registros ficam preservados.',
    "",
    `_Versão ${tagName}_`,
    "",
    "Tropeço na hora de instalar? Manda print aqui ou usa a tela *Feedback* do app. Obrigado por testar 🙏",
  );
  return linhas.join("\n");
}

/**
 * @param {string} text
 * @returns {string | null}
 */
function copyToClipboard(text) {
  const tools = [
    ["wl-copy", []],
    ["xclip", ["-selection", "clipboard"]],
    ["xsel", ["--clipboard", "--input"]],
  ];
  for (const [cmd, args] of tools) {
    try {
      execFileSync(cmd, args, { input: text });
      return cmd;
    } catch {
      // ferramenta ausente/indisponível: tenta a próxima
    }
  }
  return null;
}

// --- Modo de envio (Evolution API) ---

/**
 * Lê e valida a lista exportada pela tela de admin: [{ name, phone }].
 * @returns {{ name: string, phone: string }[]}
 */
function readTesters() {
  if (!existsSync(TESTERS_FILE)) {
    fail(
      `não achei ${TESTERS_FILE}.\n  Exporte a lista na tela de admin do app ` +
        `(backontrack://admin) e cole o JSON nesse arquivo.`,
    );
  }
  let dados;
  try {
    dados = JSON.parse(readFileSync(TESTERS_FILE, "utf8"));
  } catch (e) {
    fail(`${TESTERS_FILE} não é um JSON válido: ${e.message}`);
  }
  if (!Array.isArray(dados) || dados.length === 0) {
    fail(`${TESTERS_FILE} deve ser um array não-vazio de { name, phone }.`);
  }
  return dados.map((t, i) => {
    const phone = String(t?.phone ?? "").replace(/\D/g, "");
    if (!phone) fail(`tester #${i + 1} (${t?.name ?? "?"}) está sem 'phone'.`);
    return { name: String(t?.name ?? "(sem nome)"), phone };
  });
}

/** @returns {{ url: string, instance: string, apikey: string, delayMs: number }} */
function readEvoConfig() {
  const { EVO_URL, EVO_INSTANCE, EVO_APIKEY, EVO_DELAY_MS } = process.env;
  const faltando = [
    ["EVO_URL", EVO_URL],
    ["EVO_INSTANCE", EVO_INSTANCE],
    ["EVO_APIKEY", EVO_APIKEY],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (faltando.length) {
    fail(
      `faltam variáveis de ambiente: ${faltando.join(", ")}.\n` +
        `  ex: EVO_URL=http://localhost:8085 EVO_INSTANCE="Back on Track" ` +
        `EVO_APIKEY=xxx npm run notify:testers:send`,
    );
  }
  return {
    url: String(EVO_URL).replace(/\/+$/, ""),
    instance: String(EVO_INSTANCE),
    apikey: String(EVO_APIKEY),
    delayMs: Number(EVO_DELAY_MS) || DEFAULT_DELAY_MS,
  };
}

/** @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Confirma antes de disparar: mensagem real, irreversível, pra gente de verdade.
 * @param {number} total
 * @returns {Promise<boolean>}
 */
async function confirmSend(total) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question(
    `\n⚠️  Isso ENVIA a mensagem acima pra ${total} tester(s) no WhatsApp. Digite "enviar" pra confirmar: `,
  );
  rl.close();
  return resposta.trim().toLowerCase() === "enviar";
}

/**
 * @param {{ url: string, instance: string, apikey: string }} cfg
 * @param {string} phone
 * @param {string} text
 */
async function sendText(cfg, phone, text) {
  const rota = `${cfg.url}/message/sendText/${encodeURIComponent(cfg.instance)}`;
  const res = await fetch(rota, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.apikey },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`HTTP ${res.status} — ${detalhe.slice(0, 200)}`);
  }
}

/** @param {string} message */
async function runSend(message) {
  const cfg = readEvoConfig();
  const testers = readTesters();

  console.log(message);
  console.log("\n" + "─".repeat(40));
  console.log(`Instância: ${cfg.instance} @ ${cfg.url}`);
  console.log(`Delay entre envios: ${cfg.delayMs}ms`);
  console.log(`Testers (${testers.length}):`);
  for (const t of testers) console.log(`  • ${t.name} — ${t.phone}`);

  if (!process.argv.includes("--yes") && !(await confirmSend(testers.length))) {
    console.log("Cancelado. Nada foi enviado.");
    return;
  }

  let ok = 0;
  /** @type {string[]} */
  const falhas = [];
  for (const [i, t] of testers.entries()) {
    try {
      await sendText(cfg, t.phone, message);
      ok++;
      console.log(`✓ ${t.name} (${t.phone})`);
    } catch (e) {
      falhas.push(`${t.name} (${t.phone}): ${e.message}`);
      console.error(`✖ ${t.name} (${t.phone}) — ${e.message}`);
    }
    // Delay entre envios: baixa a chance de o WhatsApp tratar como spam.
    if (i < testers.length - 1) await sleep(cfg.delayMs);
  }

  console.log("\n" + "─".repeat(40));
  console.log(`Enviados: ${ok}/${testers.length}`);
  if (falhas.length) {
    console.log("Falhas:");
    for (const f of falhas) console.log(`  ✖ ${f}`);
    process.exit(1);
  }
}

/** @param {string} message */
function runPrint(message) {
  console.log(message);
  console.log("\n" + "─".repeat(40));
  const copied = copyToClipboard(message);
  if (copied) {
    console.log(`✓ Copiado pro clipboard (${copied}). Cole na conversa.`);
  } else {
    console.log("ℹ Clipboard indisponível — copie o texto acima manualmente.");
  }
}

/**
 * Mensagem do arquivo (--text-file) ou, no padrão, o anúncio da última release.
 * @returns {string}
 */
function resolveMessage() {
  const i = process.argv.indexOf("--text-file");
  if (i === -1) {
    // Só toca no `gh` no modo release — com --text-file nem precisa de release.
    return buildMessage(readLatestRelease(), readHomepage());
  }
  const caminho = process.argv[i + 1];
  if (!caminho) fail("--text-file precisa do caminho do arquivo.");
  if (!existsSync(caminho)) fail(`não achei o arquivo de mensagem: ${caminho}`);
  const texto = readFileSync(caminho, "utf8").trim();
  if (!texto) fail(`o arquivo de mensagem está vazio: ${caminho}`);
  return texto;
}

const message = resolveMessage();

if (process.argv.includes("--send")) {
  await runSend(message);
} else {
  runPrint(message);
}
