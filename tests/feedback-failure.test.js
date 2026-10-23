// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// De quem foi a falha no envio do feedback.
//
// As duas falhas mostravam a mesma mensagem, e quando o token do GitHub venceu
// uma tester tentou várias vezes achando que era a internet dela.

import { falhaDoEnvio } from "@/constants/feedback";

describe("falhaDoEnvio", () => {
  it("sem resposta nenhuma, foi a conexão", () => {
    // O fetch rejeitou antes de qualquer HTTP: sem rede, DNS, CORS.
    expect(falhaDoEnvio(null)).toBe("conexao");
    expect(falhaDoEnvio(undefined)).toBe("conexao");
  });

  it("qualquer resposta HTTP de erro foi o servidor", () => {
    // Inclusive o 502 que a Cloudflare devolvia no lugar da função.
    for (const status of [400, 401, 500, 502, 503]) {
      expect(falhaDoEnvio({ status })).toBe("servidor");
    }
  });
});
