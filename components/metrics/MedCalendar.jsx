// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { diaLocal } from "@/constants/habitSignals";
import { adesaoDoRemedio, semanasDoMes } from "@/constants/medPlan";
import { useThemeTokens } from "@/constants/themeTokens";
import { useMedPlan } from "@/infra/useMedPlan";

// O mês de um remédio, com um ponto em cada dia marcado (#393).
//
// Um calendário só, com o nome de cada remédio em cima pra escolher qual ver:
// um ponto por dia de todos juntos não diria qual faltou. Ponto cheio é o dia
// com todos os horários marcados, vazado é o dia com parte deles. Dia sem
// marca fica sem ponto, sem cor de falha (decisões de 30/10).

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const DIAS_DA_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const PONTO = 8;

export default function MedCalendar() {
  const { remedios, marcas } = useMedPlan();
  const abertos = remedios.filter((r) => r.estado === "aberto");
  const [escolhido, setEscolhido] = useState(null);
  const agora = new Date();
  const [mes, setMes] = useState({
    ano: agora.getFullYear(),
    mes: agora.getMonth(),
  });

  const remedio = abertos.find((r) => r.id === escolhido) ?? abertos[0];
  const adesao = useMemo(
    () => adesaoDoRemedio(remedio, marcas),
    [remedio, marcas],
  );
  if (!remedio) return null;

  const hoje = diaLocal(agora.getTime());
  const noMesAtual =
    mes.ano === agora.getFullYear() && mes.mes === agora.getMonth();
  const andar = (passo) =>
    setMes(({ ano, mes: m }) => {
      const d = new Date(ano, m + passo, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });

  return (
    <View className="gap-3">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        O mês
      </Text>
      {abertos.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {abertos.map((r) => (
            <Escolha
              key={r.id}
              nome={r.nome}
              ativa={r.id === remedio.id}
              onPress={() => setEscolhido(r.id)}
            />
          ))}
        </ScrollView>
      ) : (
        <Text
          className="text-base text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          {remedio.nome}
        </Text>
      )}
      <View className="gap-3 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4 py-4">
        <View className="flex-row items-center justify-between">
          <Seta rotulo="Mês anterior" simbolo="‹" onPress={() => andar(-1)} />
          <Text
            className="text-base text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {MESES[mes.mes]} de {mes.ano}
          </Text>
          <Seta
            rotulo="Próximo mês"
            simbolo="›"
            onPress={() => andar(1)}
            desativada={noMesAtual}
          />
        </View>
        <View className="flex-row">
          {DIAS_DA_SEMANA.map((d, i) => (
            <Text
              key={i}
              className="flex-1 text-center text-xs text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {d}
            </Text>
          ))}
        </View>
        {semanasDoMes(mes.ano, mes.mes).map((semana, i) => (
          <View key={i} className="flex-row">
            {semana.map((dia, j) => (
              <Dia
                key={dia ?? `v${j}`}
                dia={dia}
                hoje={hoje}
                ponto={dia && adesao[dia]}
              />
            ))}
          </View>
        ))}
        {remedio.horarios.length > 1 ? <Legenda /> : null}
      </View>
    </View>
  );
}

/** @param {{ nome: string, ativa: boolean, onPress: () => void }} props */
function Escolha({ nome, ativa, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativa }}
      accessibilityLabel={`Ver o mês de ${nome}`}
      onPress={onPress}
      className={`rounded-full px-4 py-2 active:opacity-70 ${
        ativa
          ? "bg-primary dark:bg-primary-dark"
          : "border border-border-strong dark:border-border-strong-dark"
      }`}
    >
      <Text
        className={`text-sm ${
          ativa
            ? "text-white dark:text-on-primary-dark"
            : "text-ink dark:text-ink-dark"
        }`}
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {nome}
      </Text>
    </Pressable>
  );
}

/**
 * @param {{
 *   rotulo: string,
 *   simbolo: string,
 *   onPress: () => void,
 *   desativada?: boolean,
 * }} props
 */
function Seta({ rotulo, simbolo, onPress, desativada }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: Boolean(desativada) }}
      disabled={desativada}
      onPress={onPress}
      hitSlop={8}
      className={`px-3 active:opacity-70 ${desativada ? "opacity-30" : ""}`}
    >
      <Text
        className="text-xl text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {simbolo}
      </Text>
    </Pressable>
  );
}

/**
 * @param {{ dia: string|null, hoje: string, ponto?: "cheio"|"meio" }} props
 */
function Dia({ dia, hoje, ponto }) {
  const t = useThemeTokens();
  if (!dia) return <View className="flex-1" />;
  const numero = Number(dia.slice(8));
  const ehHoje = dia === hoje;
  const leitura =
    ponto === "cheio"
      ? "todos os horários marcados"
      : ponto === "meio"
        ? "parte dos horários marcada"
        : "sem marca";
  return (
    <View
      className="flex-1 items-center gap-1 py-1"
      accessible
      accessibilityLabel={`Dia ${numero}${ehHoje ? ", hoje" : ""}: ${leitura}`}
    >
      <Text
        className="text-center text-sm"
        style={{
          fontFamily: ehHoje ? "Inter_600SemiBold" : "Inter_400Regular",
          color: ehHoje ? t.primary : t.ink,
        }}
      >
        {numero}
      </Text>
      <Ponto tipo={ponto} />
    </View>
  );
}

/** @param {{ tipo?: "cheio"|"meio" }} props */
function Ponto({ tipo }) {
  const t = useThemeTokens();
  return (
    <View
      style={{
        width: PONTO,
        height: PONTO,
        borderRadius: PONTO / 2,
        backgroundColor: tipo === "cheio" ? t.primary : "transparent",
        borderWidth: tipo === "meio" ? 1.5 : 0,
        borderColor: t.primary,
      }}
    />
  );
}

function Legenda() {
  return (
    <View className="flex-row gap-4 border-t border-surface-subtle dark:border-surface-subtle-dark pt-3">
      <ItemDaLegenda tipo="cheio" rotulo="todos os horários" />
      <ItemDaLegenda tipo="meio" rotulo="parte deles" />
    </View>
  );
}

/** @param {{ tipo: "cheio"|"meio", rotulo: string }} props */
function ItemDaLegenda({ tipo, rotulo }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ponto tipo={tipo} />
      <Text
        className="text-xs text-label dark:text-label-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {rotulo}
      </Text>
    </View>
  );
}
