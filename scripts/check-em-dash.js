// @ts-nocheck -- tooling Node (CommonJS), fora do tsc do app (ADR-002).
// O `exclude` do tsconfig não basta: o teste importa este módulo, e o tsc
// segue o import pra dentro de pasta excluída.
// Barreira mecânica contra o travessão de prosa (#310, fatia 4 da #302).
//
// O travessão espaçado (` — `) usado como aposto de propósito geral dá ao
// texto cara de coisa gerada por IA. A varredura da #302 tirou 520 deles do
// repo; este script existe pra que não voltem.
//
// ## Por que só o diff
//
// O repo ainda tem travessão em comentário de código (fatia 3 pendente).
// Checar a árvore inteira bloquearia todo commit. Checar só as **linhas
// adicionadas** deixa o passado em paz e trava o que entra agora. Editar uma
// linha que já tinha travessão e mantê-lo é pego de propósito: quem tocou na
// linha arruma.
//
// ## O que NÃO é prosa
//
// Três usos do caractere são legítimos e ficam de fora:
//
// 1. **Glifo de valor vazio** (`"—"`), que marca ausência de dado em
//    `formatGoal`, `CompactRow`, `ajustes` e `journeySkip`. Tem teste em cima.
// 2. **Dentro de regex**, como o `[:\s—–-]` do `MILESTONE_RE`.
// 3. **Célula vazia de tabela markdown** (`| — |`).
//
// Os dois primeiros caem fora sozinhos, porque nenhum deles tem espaço dos
// dois lados do caractere. Só a célula de tabela precisa de tratamento
// explícito, feito em `semCelulaVazia`.
//
// ## Auto-referência
//
// Este arquivo e o teste dele precisam do caractere literal pra existirem, e
// seriam bloqueados pela própria regra. Ficam isentos por caminho, em
// `EXENTOS`. A lista é curta de propósito: só os arquivos da barreira. Se ela
// crescer, é sinal de que a regra está errada, não de que faltam exceções.
//
// Escape: SKIP_EM_DASH_CHECK=1 no ambiente.

const { execFileSync } = require("node:child_process");

const TRAVESSAO = " — ";

/** Arquivos que definem a barreira, e por isso carregam o caractere literal. */
const EXENTOS = new Set([
  "scripts/check-em-dash.js",
  "tests/em-dash-barrier.test.js",
]);

/**
 * Remove as células vazias de tabela markdown (`| — |`) da linha.
 *
 * O lookahead preserva o pipe seguinte, senão duas células vazias adjacentes
 * (`| — | — |`) se comeriam e a segunda escaparia da limpeza.
 *
 * @param {string} linha
 * @returns {string}
 */
function semCelulaVazia(linha) {
  return linha.replace(/\|\s*—\s*(?=\|)/g, "|");
}

/**
 * Procura travessão de prosa numa linha.
 *
 * @param {string} linha
 * @returns {boolean}
 */
function temTravessaoDeProsa(linha) {
  return semCelulaVazia(linha).includes(TRAVESSAO);
}

/**
 * Extrai as linhas adicionadas de um diff unificado, com arquivo e número.
 *
 * Espera `--unified=0`, onde cada hunk header já dá a linha inicial exata e
 * não há contexto pra descontar.
 *
 * @param {string|null|undefined} diff Saída de `git diff --unified=0`.
 * @returns {Array<{file: string, line: number, text: string}>}
 */
function linhasAdicionadas(diff) {
  const out = [];
  let file = null;
  let linha = 0;
  for (const l of String(diff ?? "").split("\n")) {
    if (l.startsWith("+++ b/")) {
      file = l.slice(6);
      continue;
    }
    if (l.startsWith("+++ ") || l.startsWith("--- ")) continue;
    const hunk = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      linha = Number(hunk[1]);
      continue;
    }
    if (l.startsWith("+") && file) {
      out.push({ file, line: linha, text: l.slice(1) });
      linha += 1;
    }
  }
  return out;
}

/**
 * Achados de travessão de prosa nas linhas adicionadas de um diff.
 *
 * @param {string|null|undefined} diff
 * @returns {Array<{file: string, line: number, text: string}>}
 */
function achados(diff) {
  return linhasAdicionadas(diff).filter(
    (a) => !EXENTOS.has(a.file) && temTravessaoDeProsa(a.text),
  );
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function main(argv) {
  if (process.env.SKIP_EM_DASH_CHECK === "1") return 0;

  const i = argv.indexOf("--range");
  const diff =
    i !== -1
      ? git(["diff", "--unified=0", `${argv[i + 1]}..${argv[i + 2]}`])
      : git(["diff", "--cached", "--unified=0"]);

  const hits = achados(diff);
  if (hits.length === 0) return 0;

  const plural = hits.length === 1 ? "travessão" : "travessões";
  process.stderr.write(
    `\n${hits.length} ${plural} de prosa em linha adicionada:\n\n`,
  );
  for (const h of hits) {
    const j = semCelulaVazia(h.text).indexOf(TRAVESSAO);
    const trecho = h.text.slice(Math.max(0, j - 45), j + 45).trim();
    process.stderr.write(`  ${h.file}:${h.line}\n    ...${trecho}...\n`);
  }
  process.stderr.write(
    [
      "",
      "Reescreva a frase em vez de trocar o caractere. Ponto final quando as",
      "duas orações se sustentam sozinhas, vírgula quando a segunda depende da",
      "primeira, dois-pontos quando ela explica ou lista.",
      "",
      'Preservados de propósito: o glifo "—" de valor vazio, ocorrência dentro',
      "de regex, e célula vazia de tabela markdown.",
      "",
      "Escape: SKIP_EM_DASH_CHECK=1 (use só se a barreira errou).",
      "",
    ].join("\n"),
  );
  return 1;
}

module.exports = {
  achados,
  linhasAdicionadas,
  temTravessaoDeProsa,
  semCelulaVazia,
  EXENTOS,
};

if (require.main === module) process.exit(main(process.argv.slice(2)));
