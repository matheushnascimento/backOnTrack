// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable } from "tinybase/ui-react";

import MyButton from "@/components/MyButton";
import MyView from "@/components/MyView";
import MyHeader from "@/components/MyHeader";
import InstallApp from "@/components/InstallApp";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";
import MenuModal from "@/components/MenuModal";

import { getToday, store } from "@/infra/database";
import { useSession } from "@/infra/session";
import { AUTH_ENABLED } from "@/infra/supabase";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
//#endregion

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
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

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
        {/* Trigger do menu lateral: hamburger alinhado à direita, no fluxo
            do documento pra respeitar padding/safe area do MyView (posição
            absoluta ignoraria essas margens). */}
        <View className="w-full flex-row justify-end">
          <Pressable
            accessibilityLabel="Abrir menu"
            accessibilityRole="button"
            onPress={() => setMenuOpen(true)}
            className="rounded-full p-2"
          >
            <Text className="text-2xl text-light-text dark:text-dark-text">
              ☰
            </Text>
          </Pressable>
        </View>

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

        {/* Entrar isolado só quando deslogado + auth configurada. Sair vai
            pro MenuModal junto com "Logado como" — Home enxuta em ambos
            estados de auth. */}
        {AUTH_ENABLED && !user && (
          <Card className="gap-2">
            <MyButton
              title="Entrar"
              onPress={() => router.navigate("/login")}
            />
          </Card>
        )}

        {/* Wordmark discreto — marca presente na tela principal sem competir
            com o conteúdo. Ver docs/08-design-tokens.md § Identidade visual. */}
        <Text className="text-center text-xs text-light-text opacity-50 dark:text-dark-text">
          Back on Track · de volta aos trilhos, um registro por vez
        </Text>
      </ScrollView>

      <MenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </MyView>
  );
}
