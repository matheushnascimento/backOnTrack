// Versão web do cofre das chaves (#388, #410).
//
// O navegador não tem cofre do sistema. A chave do cofre vai pro IndexedDB
// embrulhada por uma chave AES-GCM que o próprio navegador gera e marca como
// NÃO exportável: a página pode usar essa chave pra cifrar e decifrar, mas não
// consegue ler os bytes dela. Quem abrir o armazenamento do navegador vê só
// texto cifrado.
//
// Com isso, o app instalado (PWA, #408) lembra a chave entre aberturas, e a
// senha de proteção é pedida uma vez por aparelho, como no Android. Um script
// malicioso rodando na página ainda consegue usar a chave enquanto roda; o que
// não consegue é levá-la embora.
//
// Sem IndexedDB (aba privada em alguns navegadores, ou bloqueado), cai pra
// memória: a senha volta a ser pedida a cada recarga, sem quebrar nada.

// @ts-nocheck -- IndexedDB e WebCrypto sem tipos de app (ADR-002)
const BANCO = "bot-cofre";
const LOJA = "chaves";
const MESTRE = "__mestre__";

/** @type {Map<string, string>} */
const memoria = new Map();

/** @returns {Promise<IDBDatabase|null>} */
function abrirBanco() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(BANCO, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Uma operação sobre a loja. `null` quando não há IndexedDB. */
async function naLoja(modo, fn) {
  const banco = await abrirBanco();
  if (!banco) return null;
  return new Promise((resolve, reject) => {
    const tx = banco.transaction(LOJA, modo);
    const out = fn(tx.objectStore(LOJA));
    tx.oncomplete = () => {
      banco.close();
      resolve(out?.result ?? null);
    };
    tx.onerror = () => {
      banco.close();
      reject(tx.error);
    };
  });
}

/** A chave que embrulha as outras. Criada uma vez por navegador. */
async function mestre() {
  const guardada = await naLoja("readonly", (s) => s.get(MESTRE));
  if (guardada) return guardada;
  const nova = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  await naLoja("readwrite", (s) => s.put(nova, MESTRE));
  return nova;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** @param {string} conta */
export async function lerCofre(conta) {
  try {
    const entrada = await naLoja("readonly", (s) => s.get(conta));
    if (!entrada) return memoria.get(conta) ?? null;
    const chave = await mestre();
    const aberto = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: entrada.iv },
      chave,
      entrada.ct,
    );
    return dec.decode(aberto);
  } catch {
    return memoria.get(conta) ?? null;
  }
}

/**
 * @param {string} conta
 * @param {string} json
 */
export async function gravarCofre(conta, json) {
  memoria.set(conta, json);
  try {
    const chave = await mestre();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      chave,
      enc.encode(json),
    );
    await naLoja("readwrite", (s) => s.put({ iv, ct }, conta));
  } catch {
    // Sem IndexedDB, fica na memória.
  }
}

/** @param {string} conta */
export async function apagarCofre(conta) {
  memoria.delete(conta);
  try {
    await naLoja("readwrite", (s) => s.delete(conta));
  } catch {
    // Nada gravado, nada a apagar.
  }
}
