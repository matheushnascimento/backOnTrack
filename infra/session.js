// @ts-nocheck -- context/session tipos vêm do Supabase; ADR-002 style.
import { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { AUTH_ENABLED, supabase } from "./supabase";

// Contexto de sessão do Supabase (M6 auth fatia A, #207, ADR-010).
//
// SessionProvider escuta `onAuthStateChange` do Supabase e expõe {session,
// user, ready, signOut} pro resto do app. Se AUTH_ENABLED for false (env
// não configurada), fica em modo pass-through: ready=true, session=null.

const SessionContext = createContext({
  session: null,
  user: null,
  ready: false,
  signOut: async () => {},
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  // ready só vira true depois da 1ª leitura da sessão persistida — evita
  // flash de "deslogado" na abertura pra quem já estava logado.
  const [ready, setReady] = useState(!AUTH_ENABLED);

  useEffect(() => {
    if (!AUTH_ENABLED || !supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Auto-refresh do token no native (#275).
  //
  // `autoRefreshToken: true` sozinho não basta aqui: o timer de refresh do
  // supabase-js é um `setInterval` do runtime JS, e no RN o runtime dorme com
  // o app em background. O token vence enquanto ninguém está olhando, e ao
  // voltar o app reconecta o sync com o token velho — foram 8 rejeições
  // `invalid token: expired` no server entre 06/08 e 12/08.
  //
  // A Supabase documenta o wiring manual por AppState pra native. No web não
  // se aplica: a aba mantém os timers, e chamar isto lá duplicaria o refresh.
  useEffect(() => {
    if (!AUTH_ENABLED || !supabase || Platform.OS === "web") return;

    const start = () => supabase.auth.startAutoRefresh();
    const stop = () => supabase.auth.stopAutoRefresh();

    // Montar já em foreground é o caso normal, mas não o único (deep link do
    // magic link pode montar com o app ainda indo pra frente).
    if (AppState.currentState === "active") start();

    const sub = AppState.addEventListener?.("change", (next) => {
      if (next === "active") start();
      else stop();
    });

    return () => {
      sub?.remove?.();
      stop();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    ready,
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
    },
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
