// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import { isTokenExpired, resolveRoomId } from "@/infra/sync-session";

// Cobre os dois defeitos da #275. Os dois eram "tratar 'ainda não sei' como se
// fosse resposta" — os testes abaixo travam justamente esse instante.

describe("resolveRoomId", () => {
  const USER = { id: "00c5fe3b-9dc7-4428-a4e8-1c9f5e426b33" };
  const ANON = "l3uqb5z8vzjsgsgv0447";

  // O bug: `getSession()` é assíncrono, então o 1º render de quem ESTÁ logado
  // tem `user: null`. Sem o gate, isso resolvia pra sala anônima e o
  // `startSync()` despejava a store inteira lá antes da sessão chegar.
  it("não devolve sala enquanto a sessão não resolveu, mesmo com anon disponível", () => {
    expect(resolveRoomId(false, null, ANON)).toBeNull();
  });

  it("não devolve sala enquanto a sessão não resolveu, mesmo já tendo user", () => {
    expect(resolveRoomId(false, USER, ANON)).toBeNull();
  });

  it("usa user.id quando a sessão resolveu e há login", () => {
    expect(resolveRoomId(true, USER, ANON)).toBe(USER.id);
  });

  it("cai pro anon quando a sessão resolveu e não há login", () => {
    expect(resolveRoomId(true, null, ANON)).toBe(ANON);
  });

  // syncRoomId vem do disco pelo persister, também async. Sem ele não há sala
  // — o caller trata null como "não abre WebSocket".
  it("devolve null quando resolveu, sem login e sem anon carregado", () => {
    expect(resolveRoomId(true, null, undefined)).toBeNull();
  });

  it("prefere user.id ao anon (login manda)", () => {
    expect(resolveRoomId(true, USER, ANON)).not.toBe(ANON);
  });
});

describe("isTokenExpired", () => {
  const AGORA = 1_760_000_000_000; // epoch ms fixo
  const seg = (ms) => Math.floor(ms / 1000);

  const sessao = (expiresAtMs) => ({
    access_token: "jwt.qualquer.coisa",
    expires_at: seg(expiresAtMs),
  });

  it("token com folga larga não está vencido", () => {
    expect(isTokenExpired(sessao(AGORA + 3_600_000), AGORA)).toBe(false);
  });

  it("token já vencido é detectado", () => {
    expect(isTokenExpired(sessao(AGORA - 1_000), AGORA)).toBe(true);
  });

  // O round-trip até o server leva tempo: um token que vence em 2s chega lá
  // vencido. Por isso a margem — evita a rejeição por milissegundos.
  it("token prestes a vencer conta como vencido (margem de 5s)", () => {
    expect(isTokenExpired(sessao(AGORA + 2_000), AGORA)).toBe(true);
  });

  it("token fora da margem ainda vale", () => {
    expect(isTokenExpired(sessao(AGORA + 10_000), AGORA)).toBe(false);
  });

  it("margem é configurável", () => {
    const s = sessao(AGORA + 10_000);
    expect(isTokenExpired(s, AGORA, 30_000)).toBe(true);
  });

  // Anônimo não tem o que renovar — dizer "vencido" bloquearia o reconnect
  // de quem nem usa auth.
  it("sessão ausente nunca está vencida", () => {
    expect(isTokenExpired(null, AGORA)).toBe(false);
    expect(isTokenExpired(undefined, AGORA)).toBe(false);
  });

  it("sessão sem access_token nunca está vencida", () => {
    expect(isTokenExpired({ expires_at: seg(AGORA - 1_000) }, AGORA)).toBe(
      false,
    );
  });

  // Defensivo: se o campo vier ausente/lixo, não dá pra concluir que venceu.
  // Bloquear o reconnect nesse caso deixaria o sync morto sem motivo.
  it("expires_at ausente ou inválido não conta como vencido", () => {
    expect(isTokenExpired({ access_token: "x" }, AGORA)).toBe(false);
    expect(
      isTokenExpired({ access_token: "x", expires_at: "abacaxi" }, AGORA),
    ).toBe(false);
    expect(isTokenExpired({ access_token: "x", expires_at: 0 }, AGORA)).toBe(
      false,
    );
  });

  // Regressão específica: `expires_at` do Supabase é em SEGUNDOS. Tratar como
  // ms daria uma data em 1970 e todo token pareceria vencido — o sync nunca
  // reconectaria depois de voltar do background.
  it("interpreta expires_at em segundos, não milissegundos", () => {
    const daquiUmaHora = sessao(AGORA + 3_600_000);
    expect(daquiUmaHora.expires_at).toBeLessThan(AGORA); // é segundos mesmo
    expect(isTokenExpired(daquiUmaHora, AGORA)).toBe(false);
  });
});
