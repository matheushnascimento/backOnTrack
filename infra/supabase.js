// @ts-nocheck -- `export let supabaseInitError = null` narrow bate no tsc (ADR-002)
/* global process */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Cliente Supabase pra auth (M6 auth fatia A, #207, ADR-010).
//
// URL/ANON KEY vêm do dashboard do Supabase — a anon key é public por design
// (vive no bundle do app), então EXPO_PUBLIC_* é ok. JWT Secret NÃO entra
// aqui (fica no server WS na fatia B).
//
// Vazio = auth desligada. Utilitário mostra estado; sync segue anônimo (o que
// já é o comportamento da fatia 3 do sync).

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Guarda o erro de init pra caso o cliente precise mostrar diagnóstico.
// Non-null sse `createClient` lançou (ex.: URL inválida — aconteceu no
// rollout do M6 quando as env vars EAS vieram com control char SYN).
export let supabaseInitError = null;

// Envelope createClient em try/catch pra crash de validação (ex.: URL
// inválido) NÃO derrubar o app inteiro. Retorna null e loga — app abre
// com auth desligada em vez de crash na abertura.
function safeCreateClient() {
  if (!AUTH_ENABLED) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Web: `undefined` = localStorage automático. Native: AsyncStorage.
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web: parsear tokens da URL após magic link redirect. Native: manual
        // via deep link handler em app/auth/callback.jsx.
        detectSessionInUrl: Platform.OS === "web",
        // Força PKCE em todas as plataformas. Sem isso, o supabase-js pode
        // gerar magic link em hash-flow (#access_token=...) que só funciona
        // com detectSessionInUrl=true — quebra no native, onde o callback
        // precisa do ?code= pra chamar exchangeCodeForSession.
        flowType: "pkce",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[supabase] createClient failed:", msg);
    supabaseInitError = msg;
    return null;
  }
}

export const supabase = safeCreateClient();
