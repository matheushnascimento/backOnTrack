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

// Se ainda não configurou, cria um stub que nunca conecta — evita crash na
// import. Telas de login devem gate em AUTH_ENABLED antes de tentar chamar.
export const supabase = AUTH_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Web: `undefined` = localStorage automático. Native: AsyncStorage.
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web: parsear tokens da URL após magic link redirect. Native: manual
        // via deep link handler em app/auth/callback.jsx.
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;
