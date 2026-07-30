// @ts-nocheck -- context/session tipos vêm do Supabase; ADR-002 style.
import { createContext, useContext, useEffect, useState } from "react";
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
