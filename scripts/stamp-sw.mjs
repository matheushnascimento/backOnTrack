#!/usr/bin/env node
// Carimba o service worker do PWA depois do `expo export` (#408).
//
// O `public/sw.js` vai pro `dist/` como está, com dois marcadores:
//   - `__VERSAO__`: muda a cada build. Sem isso o arquivo do service worker
//     seria igual entre deploys, o navegador não reinstalaria, e o cache do
//     deploy anterior nunca seria apagado.
//   - `__PRECACHE__`: a página, o bundle e o CSS do build. A primeira visita
//     baixa tudo antes de o service worker existir, então sem guardar na
//     instalação o app não abriria sem rede até a segunda visita.
//
// A versão sai do hash do bundle, que o Metro já põe no nome do arquivo:
// mesmo código, mesma versão.
//
// Uso: node scripts/stamp-sw.mjs [dist]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const html = readFileSync(join(dist, "index.html"), "utf8");

const estaticos = [
  ...html.matchAll(/(?:src|href)="(\/_expo\/static\/[^"]+)"/g),
].map((m) => m[1]);
const bundle = estaticos.find((p) => p.endsWith(".js"));
if (!bundle) {
  console.error("stamp-sw: bundle não encontrado no index.html");
  process.exit(1);
}
const versao = bundle.match(/-([0-9a-f]{8,})\.js$/)?.[1]?.slice(0, 12);
if (!versao) {
  console.error(`stamp-sw: sem hash no nome do bundle: ${bundle}`);
  process.exit(1);
}

const precache = [
  "/",
  ...new Set(estaticos),
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];

const caminho = join(dist, "sw.js");
const sw = readFileSync(caminho, "utf8");
const MARCA_PRECACHE = /\/\*__PRECACHE__\*\/ \[[^\]]*\]/;
if (!sw.includes('"__VERSAO__"') || !MARCA_PRECACHE.test(sw)) {
  console.error("stamp-sw: marcadores ausentes no sw.js");
  process.exit(1);
}
writeFileSync(
  caminho,
  sw
    .replace('"__VERSAO__"', JSON.stringify(versao))
    .replace(MARCA_PRECACHE, JSON.stringify(precache)),
);
console.log(`stamp-sw: versão ${versao}, ${precache.length} arquivos`);
