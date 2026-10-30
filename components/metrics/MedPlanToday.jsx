// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { diaLocal } from "@/constants/habitSignals";
import { planoDoDia } from "@/constants/medPlan";
import { cifrarRegistro } from "@/constants/selfcare";
import { addMedTaken, remove } from "@/infra/database";
import { useMedPlan } from "@/infra/useMedPlan";

// Os remédios de hoje, com o "tomei" de cada horário (#392).
//
// Fica no topo da tela do autocuidado, que já exige a proteção destravada.
// "Não tomei" não existe: o horário sem marca fica só sem marca (decisão de
// 29/10). Tocar de novo desmarca, pra corrigir um toque errado.

/** @param {{ chave: {kid: string, dataKey: Uint8Array} }} props */
export default function MedPlanToday({ chave }) {
  const { remedios, marcas } = useMedPlan();
  const itens = planoDoDia(remedios, marcas, diaLocal(Date.now()));
  const protegidos = remedios.filter((r) => r.estado !== "aberto").length;

  function alternar(item) {
    if (item.marca) {
      remove(item.marca);
      return;
    }
    addMedTaken(
      cifrarRegistro(chave, {
        tipo: "remedio",
        remedio: {
          id: item.remedioId,
          nome: item.nome,
          horario: item.horario,
        },
      }),
    );
  }

  return (
    <View className="gap-3">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        Remédios de hoje
      </Text>
      {itens.length === 0 ? (
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Cadastre seus remédios com nome e horário pra marcar cada um aqui.
        </Text>
      ) : (
        <View className="overflow-hidden rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark">
          {itens.map((item, i) => (
            <Linha
              key={`${item.remedioId}|${item.horario}`}
              item={item}
              primeira={i === 0}
              onPress={() => alternar(item)}
            />
          ))}
        </View>
      )}
      {protegidos > 0 ? (
        <Text
          className="text-xs text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {protegidos === 1
            ? "Um remédio do plano não abriu neste aparelho."
            : `${protegidos} remédios do plano não abriram neste aparelho.`}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          itens.length === 0 ? "Cadastrar remédio" : "Ver o mês e o plano"
        }
        onPress={() => router.push("/remedios")}
        hitSlop={8}
        className="self-start active:opacity-70"
      >
        <Text
          className="text-sm text-primary dark:text-primary-dark underline"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          {itens.length === 0 ? "Cadastrar remédio" : "Ver o mês e o plano"}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * @param {{
 *   item: {nome: string, horario: string, marca: string|null},
 *   primeira: boolean,
 *   onPress: () => void,
 * }} props
 */
function Linha({ item, primeira, onPress }) {
  const tomado = Boolean(item.marca);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: tomado }}
      accessibilityLabel={`Tomei ${item.nome} às ${item.horario}`}
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3 active:opacity-70 ${
        primeira
          ? ""
          : "border-t border-border-subtle dark:border-border-subtle-dark"
      }`}
    >
      <Text
        className="text-sm text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {item.horario}
      </Text>
      <Text
        className="flex-1 text-base text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {item.nome}
      </Text>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full ${
          tomado
            ? "bg-primary dark:bg-primary-dark"
            : "border-2 border-border-strong dark:border-border-strong-dark"
        }`}
      >
        {tomado ? (
          <Text
            className="text-xs text-white dark:text-on-primary-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
