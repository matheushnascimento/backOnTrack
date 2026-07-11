// Notificar Testers (Ciclo 5, #78) — WhatsApp assistido.
//
// Monta a mensagem de aviso da release mais recente pra colar na lista de
// transmissão do WhatsApp. NÃO envia nada: lista de transmissão não tem API
// oficial e automação não-oficial viola o ToS. Só imprime e, se possível, copia
// pro clipboard.
//
// Uso: npm run notify:testers

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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
      { cwd: ROOT, encoding: "utf8" },
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
 * @param {{ tagName: string, body?: string | null }} release
 * @param {string} homepage
 * @returns {string}
 */
function buildMessage({ tagName, body }, homepage) {
  const novidades = (body ?? "").trim();
  const linhas = [`🚀 Back on Track — ${tagName}`, ""];
  if (novidades) linhas.push(novidades, "");
  linhas.push(
    "📲 Instalar / atualizar:",
    homepage,
    "",
    "ℹ️ Já tem o app? Melhorias pequenas chegam sozinhas ao abrir. Baixe de " +
      "novo só quando eu avisar que é versão nova.",
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

const homepage = readHomepage();
const release = readLatestRelease();
const message = buildMessage(release, homepage);

console.log(message);
console.log("\n" + "─".repeat(40));

const copied = copyToClipboard(message);
if (copied) {
  console.log(
    `✓ Copiado pro clipboard (${copied}). Cole na lista de transmissão.`,
  );
} else {
  console.log("ℹ Clipboard indisponível — copie o texto acima manualmente.");
}
