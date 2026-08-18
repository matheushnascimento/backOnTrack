// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes da barreira contra o travessão de prosa (#310).
//
// O que importa aqui não é achar o travessão, que é trivial, e sim **não
// disparar** nos três usos legítimos do caractere. Uma barreira que grita
// errado ensina a ser ignorada, e aí não barra nada.

import {
  achados,
  EXENTOS,
  linhasAdicionadas,
  semCelulaVazia,
  temTravessaoDeProsa,
} from "../scripts/check-em-dash";

const diff = (linhas) =>
  ["--- a/x.js", "+++ b/x.js", "@@ -1,0 +1,1 @@", ...linhas].join("\n");

describe("temTravessaoDeProsa", () => {
  it("pega o travessão espaçado", () => {
    expect(temTravessaoDeProsa("o foco volta pra ele — sem drama")).toBe(true);
  });

  it("NÃO pega o glifo de valor vazio", () => {
    expect(temTravessaoDeProsa('  if (!alvo) return "—";')).toBe(false);
    expect(temTravessaoDeProsa('        {value ?? "—"}')).toBe(false);
    expect(temTravessaoDeProsa('  [LOCKED]: "—",')).toBe(false);
  });

  it("NÃO pega travessão dentro de regex", () => {
    expect(
      temTravessaoDeProsa(
        "const MILESTONE_RE = /^##\\s+(M\\d+)\\b[:\\s—–-]*(.*)$/;",
      ),
    ).toBe(false);
    expect(
      temTravessaoDeProsa(
        "  const cut = s.search(/:\\s|\\s[—–]\\s|\\.\\s|\\.$/);",
      ),
    ).toBe(false);
  });

  it("NÃO pega célula vazia de tabela markdown", () => {
    expect(temTravessaoDeProsa("| Água | ml | 250 (um copo) | — |")).toBe(
      false,
    );
  });

  it("pega células vazias adjacentes sem deixar a segunda escapar", () => {
    // O lookahead do `semCelulaVazia` existe por causa deste caso: sem ele, a
    // primeira substituição comeria o pipe que a segunda precisa pra casar, e
    // a segunda célula escaparia da limpeza. O pipe preservado sobra na saída,
    // o que não importa: ninguém lê o resultado, ele só alimenta a checagem.
    expect(semCelulaVazia("| a | — | — | b |")).not.toContain("—");
    expect(temTravessaoDeProsa("| a | — | — | b |")).toBe(false);
  });

  it("pega prosa na MESMA linha de uma célula vazia", () => {
    expect(temTravessaoDeProsa("| — | isto sim — é prosa |")).toBe(true);
  });

  it("NÃO pega en-dash de intervalo nem seta", () => {
    expect(temTravessaoDeProsa("faixa 18–254 dias")).toBe(false);
    expect(temTravessaoDeProsa("Store → MergeableStore")).toBe(false);
  });
});

describe("linhasAdicionadas", () => {
  it("numera a partir do hunk header e ignora removidas", () => {
    const d = [
      "--- a/a.md",
      "+++ b/a.md",
      "@@ -10,1 +10,2 @@",
      "-linha velha",
      "+primeira",
      "+segunda",
    ].join("\n");
    expect(linhasAdicionadas(d)).toEqual([
      { file: "a.md", line: 10, text: "primeira" },
      { file: "a.md", line: 11, text: "segunda" },
    ]);
  });

  it("acompanha o arquivo em diff de múltiplos arquivos", () => {
    const d = [
      "--- a/a.js",
      "+++ b/a.js",
      "@@ -1,0 +1,1 @@",
      "+um — dois",
      "--- a/b.js",
      "+++ b/b.js",
      "@@ -5,0 +5,1 @@",
      "+três — quatro",
    ].join("\n");
    expect(achados(d).map((h) => `${h.file}:${h.line}`)).toEqual([
      "a.js:1",
      "b.js:5",
    ]);
  });

  it("não confunde o cabeçalho +++ com linha adicionada", () => {
    expect(linhasAdicionadas(diff(["+ok"]))).toHaveLength(1);
  });
});

describe("achados", () => {
  it("volta vazio quando não há travessão de prosa", () => {
    expect(achados(diff(['+return "—";', "+// tudo certo"]))).toEqual([]);
  });

  it("aponta arquivo, linha e texto", () => {
    expect(achados(diff(["+algo — outra coisa"]))).toEqual([
      { file: "x.js", line: 1, text: "algo — outra coisa" },
    ]);
  });

  it("tolera diff vazio", () => {
    expect(achados("")).toEqual([]);
    expect(achados(null)).toEqual([]);
  });
});

describe("auto-referência", () => {
  it("isenta os arquivos da própria barreira", () => {
    const d = [
      "--- a/scripts/check-em-dash.js",
      "+++ b/scripts/check-em-dash.js",
      "@@ -1,0 +1,1 @@",
      '+const TRAVESSAO = " — ";',
      "--- a/app/index.jsx",
      "+++ b/app/index.jsx",
      "@@ -1,0 +1,1 @@",
      "+// isto — não escapa",
    ].join("\n");
    expect(achados(d).map((h) => h.file)).toEqual(["app/index.jsx"]);
  });

  it("a lista de isentos cobre só os dois arquivos da barreira", () => {
    // Guarda contra a lista virar depósito de exceção. Se ela crescer, a regra
    // está errada, e o teste força a conversa em vez de deixar passar.
    expect([...EXENTOS].sort()).toEqual([
      "scripts/check-em-dash.js",
      "tests/em-dash-barrier.test.js",
    ]);
  });
});
