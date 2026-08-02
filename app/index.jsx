// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { useTable } from "tinybase/ui-react";

import MyButton from "@/components/MyButton";
import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import InstallApp from "@/components/InstallApp";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";

import { clearAll, getToday, store } from "@/infra/database";
import { useSession } from "@/infra/session";
import {
  AUTH_ENABLED,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabase,
  supabaseInitError,
} from "@/infra/supabase";
import { confirmAction } from "@/constants/dialogs";
import { getEnvironmentInfo } from "@/constants/environment";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
//#endregion

// Versão/bundle exibidos nos Utilitários (#131).
const ENV = getEnvironmentInfo();

const METRICS = Object.keys(CATEGORY_MAP);
const TOTAL = METRICS.length;

// Total do dia formatado por unidade: minutos -> HH:MM; refeição pluraliza;
// o resto (ml) sai cru com a unidade.
function formatTotal(unit, total) {
  if (unit === "min") return minutesToHHMM(total);
  if (unit === "refeição")
    return `${total} ${total === 1 ? "refeição" : "refeições"}`;
  return `${total} ${unit}`;
}

function MetricRow({ done, name, detail }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base">{done ? "✅" : "⬜"}</Text>
      <Text className="flex-1 text-base text-light-text dark:text-dark-text">
        {name}
      </Text>
      <Text className="text-sm text-light-text opacity-70 dark:text-dark-text">
        {detail}
      </Text>
    </View>
  );
}

export default function Home() {
  const { toggleColorScheme } = useColorScheme();
  const { user, signOut } = useSession();

  // Assina a tabela: `useTable` re-renderiza a cada mudança nos registros —
  // inclusive quando o `startAutoLoad()` da persistência termina de carregar.
  // Ler só no foco (o padrão anterior) perdia essa carga: no primeiro load a
  // tela lia a store ainda vazia e nunca era avisada quando os dados chegavam,
  // então a Home só mostrava algo depois de ir a outra tela e voltar (#108).
  const records = useTable("records", store);
  // `records` é gatilho de propósito: muda quando a tabela muda (inclui o fim do
  // autoLoad) e força o getToday a reler. O exhaustive-deps não vê que os dois
  // olham os mesmos dados e sugere remover — o que reintroduziria o #108.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => getToday(), [records]);

  function handleClear() {
    confirmAction({
      title: "Limpar todos os dados",
      message: "Isso apaga todos os registros. Tem certeza?",
      confirmLabel: "Limpar",
      // A assinatura da store cuida do re-render; não precisa reler na mão.
      onConfirm: clearAll,
    });
  }

  const rows = METRICS.map((type) => {
    const { displayName, unit } = CATEGORY_MAP[type];
    const registros = today[type] ?? [];
    const total = registros.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const done = registros.length > 0;
    return {
      type,
      name: displayName,
      done,
      detail: done ? `${formatTotal(unit, total)} · ${registros.length}×` : "—",
    };
  });

  const registradas = rows.filter((r) => r.done).length;
  const pct = Math.round((registradas / TOTAL) * 100);
  const dataHoje = new Date().toLocaleDateString("pt-BR");

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <MyHeader />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo do dia */}
        <Card className="gap-2">
          <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
            Hoje
          </Text>
          <Text className="font-bold text-base text-light-text opacity-60 dark:text-dark-text">
            {dataHoje} · {registradas} de {TOTAL} métricas registradas
          </Text>
          <View className="h-2 w-full overflow-hidden rounded-full bg-light-background dark:bg-dark-background">
            <View
              className="h-2 rounded-full bg-secondary"
              style={{ width: `${pct}%` }}
            />
          </View>
        </Card>

        {/* Métricas do dia */}
        <Card className="gap-3">
          <SectionLabel>MÉTRICAS DE HOJE</SectionLabel>
          <MyView safe={false} className="gap-2">
            {rows.map((r) => (
              <MetricRow
                key={r.type}
                done={r.done}
                name={r.name}
                detail={r.detail}
              />
            ))}
          </MyView>
        </Card>

        {/* Obter o app (só web: QR no desktop, download no celular) */}
        <InstallApp />

        {/* Utilitários */}
        <Card className="gap-2">
          <SectionLabel>UTILITÁRIOS</SectionLabel>
          <MyButton title="Alternar tema" onPress={() => toggleColorScheme()} />
          <MyButton
            title="Histórico"
            onPress={() => router.navigate("/history")}
          />
          <MyButton title="Limpar todos os dados" onPress={handleClear} />
          <MyButton
            title="Enviar feedback"
            onPress={() => router.navigate("/feedback")}
          />
          <MyButton
            title="Roadmap do projeto"
            onPress={() => router.navigate("/roadmap")}
          />
          {/* Auth (fatia A do M6): botão condicional. Só aparece se as env
              vars do Supabase estiverem configuradas — do contrário, o botão
              não faria nada útil. Sync ainda anônimo nesta fatia. */}
          {AUTH_ENABLED &&
            (user ? (
              <>
                <Text className="pt-1 text-center text-xs text-light-text opacity-70 dark:text-dark-text">
                  Logado como {user.email}
                </Text>
                <MyButton title="Sair" onPress={() => signOut()} />
              </>
            ) : (
              <MyButton
                title="Entrar"
                onPress={() => router.navigate("/login")}
              />
            ))}
          {/* Versão visível pro tester saber (e reportar) em qual bundle está —
              o OTA troca o JS sem mudar a versão do app (#131). */}
          <Text className="pt-1 text-center text-xs text-light-text opacity-50 dark:text-dark-text">
            v{ENV.appVersion}
            {ENV.bundle ? ` · ${ENV.bundle}` : ""}
          </Text>
          {/* TEMP DEBUG: mostra estado do supabase.js pra diagnóstico do
              crash "Invalid supabaseUrl" sem precisar de adb logcat. Ver
              PR #221 e a próxima. Remover assim que bug resolvido. */}
          <Text
            selectable
            className="pt-2 text-center text-xs text-light-text opacity-70 dark:text-dark-text"
          >
            DEBUG · url_type={typeof SUPABASE_URL} url_len=
            {SUPABASE_URL?.length ?? 0} url_head=
            {JSON.stringify(SUPABASE_URL?.slice(0, 10) ?? "")}
            {"\n"}
            key_type={typeof SUPABASE_ANON_KEY} key_len=
            {SUPABASE_ANON_KEY?.length ?? 0} key_head=
            {JSON.stringify(SUPABASE_ANON_KEY?.slice(0, 6) ?? "")}
            {"\n"}
            auth_enabled={String(AUTH_ENABLED)} supabase_null=
            {String(supabase === null)}
            {"\n"}
            init_err={String(supabaseInitError ?? "none")}
          </Text>
        </Card>

        {/* Wordmark discreto — marca presente na tela principal sem competir
            com o conteúdo. Ver docs/08-design-tokens.md § Identidade visual. */}
        <Text className="text-center text-xs text-light-text opacity-50 dark:text-dark-text">
          Back on Track · de volta aos trilhos, um registro por vez
        </Text>
      </ScrollView>
    </MyView>
  );
}
