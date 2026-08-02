// @ts-nocheck -- debug patch com let export com narrow inicial null (ADR-002)
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

// TEMP debug (crash investigation): logs the URL/key that Metro actually
// baked at build time. Visible via `adb logcat *:S ReactNativeJS:V`.
// Remove after fixing.
console.log(
  "[supabase-debug] URL type:",
  typeof SUPABASE_URL,
  "length:",
  SUPABASE_URL?.length,
  "value:",
  JSON.stringify(SUPABASE_URL),
);
console.log(
  "[supabase-debug] KEY type:",
  typeof SUPABASE_ANON_KEY,
  "length:",
  SUPABASE_ANON_KEY?.length,
  "first 4:",
  JSON.stringify(SUPABASE_ANON_KEY?.slice(0, 4)),
);

export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Envelope createClient em try/catch pra crash de validação (ex.: URL
// inválido) NÃO derrubar o app inteiro. Retorna null e loga — app abre
// com auth desligada em vez de crash na abertura.
// TEMP debug: também guarda o erro num export pra UI mostrar (sem ADB).
export let supabaseInitError = null;

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
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[supabase-debug] createClient falhou:", msg);
    supabaseInitError = msg;
    return null;
  }
}

export const supabase = safeCreateClient();
