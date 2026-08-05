// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testa o backoff do reconnect do sync WS. É o pedaço puro da correção do
// auto-reconnect — a parte onde bug moraria (crescimento errado, teto que
// não segura, jitter que sincroniza todo mundo, entrada negativa/absurda).
//
// Contexto: sem reconexão, uma queda de WS deixava o app sem sync até o
// próximo launch. Foi o que fez a quebra do ES256 durar semanas.

import {
  retryDelay,
  BASE_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
} from "../infra/sync-retry";

// random fixo tira o jitter da conta e deixa a progressão determinística:
// 0.5 + 0.5*1 = 1, ou seja, o delay cheio.
const noJitter = () => 1;
// 0.5 + 0.5*0 = 0.5, o piso da janela.
const minJitter = () => 0;

describe("retryDelay", () => {
  test("cresce exponencial a partir do base", () => {
    const d = (n) => retryDelay(n, { random: noJitter });
    expect(d(0)).toBe(BASE_RETRY_DELAY_MS); // 1s
    expect(d(1)).toBe(BASE_RETRY_DELAY_MS * 2); // 2s
    expect(d(2)).toBe(BASE_RETRY_DELAY_MS * 4); // 4s
    expect(d(3)).toBe(BASE_RETRY_DELAY_MS * 8); // 8s
  });

  test("respeita o teto — queda longa não vira espera de minutos", () => {
    const d = (n) => retryDelay(n, { random: noJitter });
    expect(d(10)).toBe(MAX_RETRY_DELAY_MS);
    expect(d(50)).toBe(MAX_RETRY_DELAY_MS);
    // Sem o cap antes do 2**n, expoente alto estouraria pra Infinity.
    expect(Number.isFinite(d(1000))).toBe(true);
    expect(d(1000)).toBe(MAX_RETRY_DELAY_MS);
  });

  test("jitter mantém o delay em [metade, cheio] — nunca zero", () => {
    for (const n of [0, 1, 5, 99]) {
      const cheio = retryDelay(n, { random: noJitter });
      const piso = retryDelay(n, { random: minJitter });
      expect(piso).toBe(Math.round(cheio * 0.5));
      expect(piso).toBeGreaterThan(0);
      // Amostra real: sempre dentro da janela.
      for (let i = 0; i < 50; i++) {
        const real = retryDelay(n);
        expect(real).toBeGreaterThanOrEqual(piso);
        expect(real).toBeLessThanOrEqual(cheio);
      }
    }
  });

  test("jitter de fato espalha — clientes não voltam todos juntos", () => {
    // 200 "clientes" caindo na mesma tentativa devem produzir delays variados.
    // Sem jitter, todos retornariam o mesmo valor e derrubariam o server de novo.
    const amostras = new Set();
    for (let i = 0; i < 200; i++) amostras.add(retryDelay(5));
    expect(amostras.size).toBeGreaterThan(50);
  });

  test("entrada inválida não quebra nem produz delay negativo", () => {
    for (const bad of [-1, -999, NaN, undefined, null, "abc"]) {
      const d = retryDelay(bad, { random: noJitter });
      expect(d).toBe(BASE_RETRY_DELAY_MS);
    }
  });

  test("base e max são configuráveis", () => {
    const d = retryDelay(3, { base: 100, max: 500, random: noJitter });
    expect(d).toBe(500); // 100*8=800, capado em 500
  });
});
