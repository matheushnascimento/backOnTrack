// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Parser do roadmap (M4, #140). É ele que alimenta a tela /roadmap a partir do
// docs/04-roadmap-milestones.md — se quebrar, a tela mente ou some.
import { parseRoadmap, cleanText, getDigest } from "../constants/roadmap";

const MD = `
## M0: Fundamentos ✅ concluído

- ✅ Ambiente configurado
- ✅ Navegação entre telas

## M1 — Trabalho real

- ✅ Persistência integrada
- 🟡 Migração de estilo
- ⬜ Documentação de manutenção
`;

describe("parseRoadmap", () => {
  test("extrai milestones na ordem, com id e título limpos", () => {
    const ms = parseRoadmap(MD);
    expect(ms.map((m) => m.id)).toEqual(["M0", "M1"]);
    expect(ms[0].title).toBe("Fundamentos");
    expect(ms[1].title).toBe("Trabalho real");
  });

  test("extrai os itens com status", () => {
    const [, m1] = parseRoadmap(MD);
    expect(m1.items).toEqual([
      { status: "done", text: "Persistência integrada" },
      { status: "partial", text: "Migração de estilo" },
      { status: "todo", text: "Documentação de manutenção" },
    ]);
  });

  test("status da milestone: header manda; senão, infere dos itens", () => {
    const [m0, m1] = parseRoadmap(MD);
    expect(m0.status).toBe("done"); // "✅ concluído" no header
    expect(m1.status).toBe("partial"); // itens mistos → parcial
  });

  test("tolerante: linhas fora do padrão não quebram nem viram item", () => {
    const ms = parseRoadmap("## M9 Teste\n\ntexto solto\n- ✅ item real\n");
    expect(ms).toHaveLength(1);
    expect(ms[0].items).toEqual([{ status: "done", text: "item real" }]);
  });
});

describe("cleanText", () => {
  test("remove link markdown, mantendo o rótulo", () => {
    expect(cleanText("Histórico [#63](https://x)")).toBe("Histórico");
  });

  test("remove `code`, **bold** e parênteses simples", () => {
    expect(cleanText("Tela `app/index.jsx` (#94)")).toBe("Tela app/index.jsx");
    expect(cleanText("**Editar** registros")).toBe("Editar registros");
  });

  test("corta na manchete (primeiro ':' depois do 15º caractere)", () => {
    expect(
      cleanText("Histórico navegável por data: tela app/history.jsx"),
    ).toBe("Histórico navegável por data");
  });

  test("LIMITAÇÃO conhecida: parênteses aninhados deixam ')' órfão", () => {
    // O regex remove de '(' até o PRIMEIRO ')', então aninhado sobra lixo.
    // Documentado de propósito: se alguém consertar o parser, este teste avisa
    // (é o que motivou reescrever o item do M4 sem parênteses aninhados).
    expect(cleanText("roda (expect(1+1).toEqual(2)) no CI")).toContain(
      "toEqual)",
    );
  });
});

describe("getDigest", () => {
  test("contagem de milestones e milestone atual (primeira não-done)", () => {
    const d = getDigest(parseRoadmap(MD));
    expect(d.milestonesDone).toBe(1);
    expect(d.milestonesTotal).toBe(2);
    expect(d.current.id).toBe("M1"); // primeira não-done
  });

  test("devolve só o que a tela não deriva sozinha (#303)", () => {
    // A tela lista todas as milestones e conta os itens de cada uma, então
    // `recentDone` e `currentProgress` perderam consumidor. Este teste existe
    // pra que voltar a adicioná-los seja uma decisão, e não um acidente.
    expect(Object.keys(getDigest(parseRoadmap(MD))).sort()).toEqual([
      "current",
      "milestonesDone",
      "milestonesTotal",
    ]);
  });

  test("current pula milestones ⬜ do meio pra pegar a próxima na ordem (#147)", () => {
    // Cenário do #147: dívida pendente lá no fim (partial) NÃO deve ganhar de
    // milestones ⬜ que vêm antes. "Atual" = próximo trabalho na ordem.
    const md = `
## M0 Feito
- ✅ x
## M1 Próximo
- ⬜ a
## M2 Também aberto
- ⬜ b
## M3 Dívida pendente do fim
- 🟡 c
- ⬜ d
`;
    expect(getDigest(parseRoadmap(md)).current.id).toBe("M1");
  });
});
