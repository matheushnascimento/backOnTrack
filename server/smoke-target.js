// @ts-nocheck -- código Node do server, fora do tsc do app (ADR-002).
//
// Alvo de uma rodada de smoke: a URL do WebSocket, a sala, e se vai com token.
//
// Existe porque o `AUTH_MODE=required` (04/09) quebrou os dois scripts de
// smoke de uma vez: eles conectavam sem token e passaram a levar 401 sempre.
// Isolado num módulo próprio pra ser testável sem abrir socket.
//
// ## Por que a sala é obrigada a sair do token
//
// O server recusa com 403 quando `sub !== pathId`. Então, autenticado, a
// única sala conectável é a do próprio dono do token. Passar `ROOM` junto com
// `TOKEN` só funciona se for exatamente o `sub`, e aqui isso vira erro cedo,
// com mensagem, em vez de um 403 opaco no handshake.
//
// ## Sobre não verificar a assinatura
//
// Ler os claims sem verificar é suficiente e correto neste ponto: quem valida
// é o server, e o pior caso de um token inválido aqui é o próprio server
// recusar a conexão. A duplicação do `base64UrlDecode` que existe no
// `server.js` é deliberada: importar de lá subiria um servidor, porque aquele
// arquivo é script e não biblioteca.

/** base64url → Buffer. JWT usa a variante URL-safe (`-` e `_`). */
export function base64UrlDecode(str) {
  const pad = "===".slice((str.length + 3) % 4);
  const b64 = String(str).replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

/**
 * Claims de um JWT, sem verificar assinatura.
 *
 * @param {string} token
 * @returns {object|null} `null` se não der pra ler
 */
export function claimsOf(token) {
  if (typeof token !== "string") return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(partes[1]).toString("utf8"));
  } catch {
    return null;
  }
}

/** `ws://host` → `http://host`, pra falar com o `/healthz` do mesmo server. */
export function httpBaseOf(wsUrl) {
  return String(wsUrl).replace(/^ws/, "http").replace(/\/+$/, "");
}

/**
 * Resolve o alvo da rodada.
 *
 * @param {{url: string, room?: string, token?: string, fallbackRoom?: string}} args
 * @returns {{wsUrl: string, room: string, authed: boolean, sub: string|null}}
 * @throws {Error} quando o token não dá pra ler, ou a sala pedida briga com o `sub`
 */
export function resolveTarget({
  url,
  room,
  token,
  fallbackRoom = "smoke-test",
}) {
  const base = String(url ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("URL vazia");

  if (!token) {
    return {
      wsUrl: `${base}/${room || fallbackRoom}`,
      room: room || fallbackRoom,
      authed: false,
      sub: null,
    };
  }

  const claims = claimsOf(token);
  if (!claims) throw new Error("TOKEN não é um JWT legível (esperado a.b.c)");
  const sub = claims.sub;
  if (!sub) throw new Error("TOKEN sem claim `sub`, e é dele que sai a sala");

  if (room && room !== sub) {
    throw new Error(
      `ROOM="${room}" diferente do sub do token ("${sub}"). ` +
        "O server recusaria com 403. Omita ROOM pra usar a sala do token.",
    );
  }

  return {
    wsUrl: `${base}/${encodeURIComponent(sub)}?token=${encodeURIComponent(token)}`,
    room: sub,
    authed: true,
    sub,
  };
}

/**
 * Diagnóstico depois de uma conexão recusada.
 *
 * O handshake WebSocket não entrega o status HTTP pro cliente (mesmo motivo do
 * `/healthz` existir, ver #278), então uma recusa por política é
 * indistinguível de queda de rede. Perguntar ao `/healthz` separa as duas.
 *
 * @param {{baseUrl: string, authed: boolean, fetchImpl?: Function}} args
 * @returns {Promise<string>} frase pronta pra imprimir
 */
export async function diagnose({ baseUrl, authed, fetchImpl = fetch }) {
  const alvo = `${httpBaseOf(baseUrl)}/healthz`;
  try {
    const r = await fetchImpl(alvo);
    const body = await r.json();
    if (body?.authMode === "required" && !authed) {
      return `server em AUTH_MODE=required e a rodada foi sem token. Passe TOKEN=<jwt>.`;
    }
    return `server respondeu authMode=${body?.authMode}. A recusa não foi por falta de token.`;
  } catch {
    return `não consegui falar com ${alvo}. Pode ser rede, ou o server fora do ar.`;
  }
}
