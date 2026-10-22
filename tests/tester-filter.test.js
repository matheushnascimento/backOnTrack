// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Envio só pra testers escolhidos (#372). Mensagem enviada não volta, então o
// que importa aqui é nunca cair em "todo mundo" por engano.

import { filtrarTesters } from "../scripts/tester-filter";

const lista = [
  { name: "Nayara", phone: "1" },
  { name: "Thalita", phone: "2" },
  { name: "Gleicy", phone: "3" },
];

describe("filtrarTesters", () => {
  it("sem pedido, a lista inteira", () => {
    expect(filtrarTesters(lista, undefined)).toEqual({
      testers: lista,
      faltando: [],
    });
  });

  it("um nome, só ele", () => {
    const { testers, faltando } = filtrarTesters(lista, "Thalita");
    expect(testers.map((t) => t.name)).toEqual(["Thalita"]);
    expect(faltando).toEqual([]);
  });

  it("vários, separados por vírgula", () => {
    const { testers } = filtrarTesters(lista, "Gleicy, Nayara");
    expect(testers.map((t) => t.name)).toEqual(["Nayara", "Gleicy"]);
  });

  it("ignora maiúsculas e acentos", () => {
    const { testers } = filtrarTesters(lista, "thalitá");
    expect(testers.map((t) => t.name)).toEqual(["Thalita"]);
  });

  it("nome que não existe vira erro, e não envio vazio nem envio pra todos", () => {
    const { testers, faltando } = filtrarTesters(lista, "Thalita, Talita");
    expect(faltando).toEqual(["talita"]);
    // Quem chama aborta quando há faltando; a lista parcial não é enviada.
    expect(testers.map((t) => t.name)).toEqual(["Thalita"]);
  });

  it("pedido vazio é erro", () => {
    expect(filtrarTesters(lista, " , ").faltando).not.toEqual([]);
    expect(filtrarTesters(lista, "").faltando).not.toEqual([]);
  });
});
