// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Identificação do assistente nas mensagens enviadas (#385).

import { IDENTIFICACAO, identificar } from "../scripts/assistant-label";

describe("identificar", () => {
  it("põe a identificação no topo, separada por uma linha em branco", () => {
    expect(identificar("Oi, Nayara!")).toBe(`${IDENTIFICACAO}\n\nOi, Nayara!`);
  });

  it("vale também pro anúncio de release", () => {
    const anuncio = "✨ *Back on Track* atualizou\n\n*Lembretes*";
    expect(identificar(anuncio).startsWith(IDENTIFICACAO)).toBe(true);
    expect(identificar(anuncio)).toContain(anuncio);
  });

  it("não duplica se o texto já se identifica", () => {
    const texto = "Oi! Aqui é o assistente do Back on Track. Tudo certo?";
    expect(identificar(texto)).toBe(texto);
  });

  it("aplicar duas vezes dá o mesmo resultado", () => {
    const uma = identificar("Oi!");
    expect(identificar(uma)).toBe(uma);
  });
});
