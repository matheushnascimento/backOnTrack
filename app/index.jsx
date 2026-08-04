// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import InstallApp from "@/components/InstallApp";
import MetricCard from "@/components/MetricCard";
import MenuModal from "@/components/MenuModal";
import Icon1c from "@/components/Icon1c";

import { getToday, store } from "@/infra/database";
import { useSession } from "@/infra/session";
import { AUTH_ENABLED } from "@/infra/supabase";
import { CATEGORY_MAP } from "@/components/categoryUtils";
import { minutesToHHMM } from "@/constants/duration";
//#endregion

const METRICS = Object.keys(CATEGORY_MAP);

// Formata o total do dia por unidade. Migração v2: usa vírgula pra ml (padrão pt-BR)
// e HH:MM pra minutos. Pluraliza refeição.
function formatValue(unit, total) {
  if (unit === "min") return minutesToHHMM(total);
  if (unit === "refeição")
    return `${total} ${total === 1 ? "refeição" : "refeições"}`;
  if (unit === "ml") return `${total.toLocaleString("pt-BR")} ml`;
  return `${total} ${unit}`;
}

// Saudação por horário. Design v2 usa "Bom dia, Ana." — nome vem do email
// do usuário logado; deslogado usa só o cumprimento.
function getGreeting(user) {
  const h = new Date().getHours();
  const g = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  if (!user?.email) return `${g}.`;
  const raw = user.email.split("@")[0];
  const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return `${g}, ${name}.`;
}

// Data no formato "SEGUNDA · 12 AGO" (pt-BR, uppercase). Usada como label
// discreto acima do greeting.
function formatDateLabel() {
  const d = new Date();
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long" });
  const day = d.getDate();
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  return `${weekday} · ${day} ${month}`.toUpperCase();
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

  const totalRecords = METRICS.reduce((s, m) => s + (today[m]?.length ?? 0), 0);

  const cards = METRICS.map((type) => {
    const { displayName, unit } = CATEGORY_MAP[type];
    const registros = today[type] ?? [];
    const total = registros.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const active = registros.length > 0;
    return {
      key: type,
      metric: type,
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      active,
      value: active ? formatValue(unit, total) : null,
      detail:
        active && registros.length > 1 ? `${registros.length} registros` : null,
    };
  });

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Trigger do menu lateral — hamburger alinhado à esquerda pra casar
            com o painel que abre da esquerda. */}
        <View className="w-full flex-row justify-start">
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

        {/* Header: data · greeting · mini-ícone 1c · subtitle. Padrão da mockup
            2a·1 do design v2. */}
        <View className="gap-1 px-1">
          <Text
            className="text-xs tracking-wider text-label"
            style={{ fontFamily: "JetBrainsMono_500Medium" }}
          >
            {formatDateLabel()}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-2xl text-ink"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {getGreeting(user)}
            </Text>
            <View
              className="items-center justify-center rounded-lg bg-primary"
              style={{ width: 32, height: 32 }}
            >
              <Icon1c size={22} />
            </View>
          </View>
          <Text
            className="text-sm text-body-secondary"
            style={{ fontFamily: "Inter_400Regular", marginTop: 2 }}
          >
            {totalRecords === 0
              ? "Nenhum registro hoje ainda. Sem pressa."
              : `${totalRecords} ${totalRecords === 1 ? "registro" : "registros"} hoje. Sem pressa.`}
          </Text>
        </View>

        {/* 5 metric cards — toque navega pro registro rápido. */}
        <View className="gap-2.5">
          {cards.map((c) => (
            <MetricCard
              key={c.key}
              metric={c.metric}
              name={c.name}
              active={c.active}
              value={c.value}
              detail={c.detail}
              onPress={() => router.navigate(`/(metrics)/${c.metric}`)}
            />
          ))}
        </View>

        {/* Obter o app (só web: QR no desktop, download no celular) */}
        <InstallApp />

        {/* Entrar isolado só quando deslogado + auth configurada. Sair vai
            pro MenuModal junto com "Logado como". */}
        {AUTH_ENABLED && !user && (
          <View className="rounded-2xl border border-border-subtle bg-white p-4">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate("/login")}
              className="items-center rounded-xl bg-primary py-3"
            >
              <Text
                className="text-sm text-white"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                Entrar
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <MenuModal visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </MyView>
  );
}
