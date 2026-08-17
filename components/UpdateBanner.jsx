// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Banners do rodapé (evoluído do #131).
//
// Quatro estados, em ordem de prioridade (só um aparece):
//
//   1. NATIVE_OUTDATED  — versão do APK em execução é MENOR que a última
//      publicada. Nesses casos o OTA não cobre (`runtimeVersion.policy:
//      "appVersion"` — publicação nova sai em runtime N+1, o device em N
//      ignora silenciosamente). Único jeito é reinstalar o APK. Banner
//      prioritário porque tudo mais é sintoma disso.
//
//   2. DOWNLOADING      — expo-updates tá baixando bundle novo em background.
//      Sem progresso real (a API pública não expõe bytes), então usamos uma
//      ProgressBar indeterminada — sinaliza "atividade em andamento" sem
//      mentir sobre percentual.
//
//   3. UPDATE_PENDING   — bundle baixado, esperando reload. Toque aplica.
//      Comportamento original do #131.
//
//   4. NEEDS_AUTH       — o sync foi recusado por falta de login (#281). Vem
//      por último de propósito: os três de cima são transitórios e se
//      resolvem sozinhos, este persiste até a pessoa entrar. Se disputassem,
//      o permanente esconderia os passageiros.
//
//      É o único **dispensável**, pela mesma razão: um aviso que não passa e
//      não fecha vira ruído em cima de quem já decidiu não logar. Dispensar
//      vale só pra sessão (mesmo critério do `RetomadaState` da Home) —
//      próxima abertura convida de novo, que é o objetivo.
//
// Em dev/web/native sem update mecanismo os hooks retornam false — banner
// não aparece. Fetch da última APK version só tenta em native com rede;
// falha silenciosa mantém o banner desligado.

import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressBar } from "react-native-paper";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useUpdates, reloadAsync } from "expo-updates";

import { SYNC_NEEDS_AUTH, useSyncStatus } from "@/infra/sync";
import { pickBanner } from "@/constants/bannerPriority";
import { useThemeTokens } from "@/constants/themeTokens";

// Fonte remota da última versão do APK cortada, atualizada manualmente no repo
// quando um build novo é distribuído. Preferi raw.githubusercontent.com em vez
// de embed no bundle porque o cliente numa versão VELHA precisa saber de uma
// versão MAIS NOVA que ele — o bundle dele nunca vai ter esse valor por
// definição. Cache do GitHub CDN é ~5min, suficiente pro caso de uso.
const LATEST_APK_URL =
  "https://raw.githubusercontent.com/matheushnascimento/backOnTrack/main/assets/latest-apk-version.json";

/**
 * "1.1.1" vs "1.2.0" → true se `current < latest`. Assume semver simples
 * (major.minor.patch numérico) — o que app.json.version segue.
 */
function isBehind(current, latest) {
  if (!current || !latest) return false;
  const c = current.split(".").map(Number);
  const l = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] ?? 0;
    const lv = l[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export default function UpdateBanner() {
  const { isUpdatePending, isDownloading } = useUpdates();
  const insets = useSafeAreaInsets();
  const t = useThemeTokens();
  const { status: syncStatus } = useSyncStatus();
  // Dispensa só a sessão atual — ver a nota de prioridade no topo do arquivo.
  const [authDismissed, setAuthDismissed] = useState(false);

  // Última APK conhecida — carrega em background, sem bloquear render.
  const [latestApk, setLatestApk] = useState(
    /** @type {{version: string, installUrl?: string} | null} */ (null),
  );
  useEffect(() => {
    // Só faz sentido no native (web tem o próprio fluxo de deploy). AbortController
    // pra não vazar setState se o componente desmontar antes do fetch resolver.
    if (Platform.OS === "web") return;
    const ctrl = new AbortController();
    fetch(LATEST_APK_URL, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.version) setLatestApk(d);
      })
      .catch(() => {
        /* falha silenciosa — banner de native update só aparece se der certo */
      });
    return () => ctrl.abort();
  }, []);

  const currentVersion = Constants.expoConfig?.version;
  const nativeOutdated =
    latestApk != null && isBehind(currentVersion, latestApk.version);

  const bottomPad = insets.bottom + 12;

  const qual = pickBanner({
    nativeOutdated,
    isDownloading,
    isUpdatePending,
    needsAuth: syncStatus === SYNC_NEEDS_AUTH,
    authDismissed,
  });

  if (qual === "native-outdated") {
    const url = latestApk.installUrl;
    return (
      <BannerBase
        color={t.primary}
        bottomPad={bottomPad}
        onPress={url ? () => Linking.openURL(url).catch(() => {}) : undefined}
        accessibilityLabel={`Nova versão do app disponível: ${latestApk.version}`}
      >
        <Text
          className="text-center text-white dark:text-on-primary-dark"
          style={{ fontFamily: "Inter_600SemiBold", fontSize: 14 }}
        >
          Nova versão do app disponível
        </Text>
        <Text
          className="text-center text-white dark:text-on-primary-dark opacity-80"
          style={{ fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}
        >
          Toque para instalar {latestApk.version} · você está em v
          {currentVersion}
        </Text>
      </BannerBase>
    );
  }

  if (qual === "downloading") {
    return (
      <BannerBase color={t.surfaceSubtle} bottomPad={bottomPad}>
        <Text
          className="text-center text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_500Medium", fontSize: 13 }}
        >
          Baixando atualização…
        </Text>
        <View style={{ marginTop: 8, borderRadius: 4, overflow: "hidden" }}>
          <ProgressBar indeterminate color={t.primary} />
        </View>
      </BannerBase>
    );
  }

  if (qual === "update-pending") {
    return (
      <BannerBase
        color={t.accentToday}
        bottomPad={bottomPad}
        onPress={() => reloadAsync()}
        accessibilityLabel="Atualização pronta. Toque para reiniciar"
      >
        <Text
          className="text-center text-white"
          style={{ fontFamily: "Inter_600SemiBold", fontSize: 14 }}
        >
          Atualização pronta — toque para reiniciar
        </Text>
      </BannerBase>
    );
  }

  // Falta login (#281). Só chega aqui quando o server recusou por política —
  // ver `SYNC_NEEDS_AUTH` em infra/sync.js. Copy sem cobrança e sem alarme: o
  // registro local está intacto, o que falta é a cópia na conta.
  if (qual === "needs-auth") {
    return (
      <BannerBase
        color={t.surfaceSubtle}
        bottomPad={bottomPad}
        onPress={() => router.navigate("/login")}
        accessibilityLabel="Entrar para sincronizar seus registros"
        onDismiss={() => setAuthDismissed(true)}
      >
        <Text
          className="text-center text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_600SemiBold", fontSize: 14 }}
        >
          Entre para guardar seus registros na sua conta
        </Text>
        <Text
          className="text-center text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}
        >
          Eles seguem salvos aqui no aparelho. Toque para entrar.
        </Text>
      </BannerBase>
    );
  }

  return null;
}

/**
 * Wrapper visual + safe-area comum aos banners. Absoluto no rodapé porque
 * cada tela já monta o próprio safe-area (MyView safe) e o app é edge-to-edge;
 * absoluto flutua sem mexer no layout de ninguém.
 *
 * `onDismiss` é opcional e só o banner de login usa (#281) — os de
 * atualização não fecham porque somem sozinhos quando a causa passa.
 *
 * @param {{
 *   color: string,
 *   bottomPad: number,
 *   onPress?: () => void,
 *   onDismiss?: () => void,
 *   accessibilityLabel?: string,
 *   children: any,
 * }} props
 */
function BannerBase({
  color,
  bottomPad,
  onPress,
  onDismiss,
  accessibilityLabel,
  children,
}) {
  // Área principal e botão de fechar são IRMÃOS, nunca aninhados.
  //
  // Aninhar quebra no web: o `accessibilityRole="button"` faz o
  // react-native-web renderizar um `<button>` de verdade, e `<button>` dentro
  // de `<button>` é aninhamento inválido — o React DOM recusa e derruba a
  // árvore. Só apareceu quando o banner de login passou `onPress` e
  // `onDismiss` juntos; os três de atualização nunca tiveram botão de fechar.
  //
  // O padding fica no filho, não neste wrapper, pra toque na borda ainda
  // contar como toque no banner.
  const miolo = (
    // Reserva à direita pro botão de fechar não cobrir o fim do texto.
    // Sem isso a última palavra passa por baixo do × em telas estreitas.
    <View style={onDismiss ? { paddingRight: 32 } : undefined}>{children}</View>
  );
  return (
    <View
      className="absolute right-0 bottom-0 left-0"
      style={{ backgroundColor: color }}
    >
      {onPress ? (
        <Pressable
          onPress={onPress}
          android_ripple={{ color: "#00000022" }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          className="px-4 pt-3"
          style={{ paddingBottom: bottomPad }}
        >
          {miolo}
        </Pressable>
      ) : (
        <View className="px-4 pt-3" style={{ paddingBottom: bottomPad }}>
          {miolo}
        </View>
      )}
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dispensar aviso"
          onPress={onDismiss}
          // Área de toque generosa: o alvo visual é um glifo pequeno, e no
          // rodapé o polegar erra fácil.
          hitSlop={12}
          className="absolute right-2 active:opacity-60"
          style={{ top: 8, padding: 8 }}
        >
          {/* `text-center` com largura fixa, não `items-center` no pai: o
              Text encolhido ao conteúdo deixa a medição do Android decidir a
              caixa, e ela erra com a Inter cortando o glifo. */}
          <Text
            className="text-center text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_500Medium", fontSize: 16, width: 16 }}
          >
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
