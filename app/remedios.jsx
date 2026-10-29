// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import MyView from "@/components/MyView";
import { BotaoPrimario, Portao } from "@/components/metrics/SelfcareBespoke";
import TimePickerField from "@/components/metrics/TimePickerField";
import { confirmAction } from "@/constants/dialogs";
import { cifrarRemedio, normalizarHorarios } from "@/constants/medPlan";
import { goBack } from "@/constants/navigation";
import { useThemeTokens } from "@/constants/themeTokens";
import { addMed, removeMed, updateMed } from "@/infra/database";
import { useMedPlan } from "@/infra/useMedPlan";
import { useProtection } from "@/infra/useProtection";

// Plano de remédios (#392): cadastrar, alterar e tirar do plano.
//
// Nome e horários vão cifrados, então a tela exige a proteção destravada, como
// o autocuidado. Um remédio pode ter vários horários (decisão de 29/10). Tirar
// do plano não apaga os "tomei" já marcados: eles levam o nome dentro e
// continuam no histórico.

export default function Remedios() {
  const t = useThemeTokens();
  const protecao = useProtection();

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => goBack("/(metrics)/selfcare")}
          className="self-start rounded-full p-1 pr-2 active:opacity-70"
        >
          <Text
            className="text-base text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_500Medium", color: t.primary }}
          >
            ‹ Voltar
          </Text>
        </Pressable>
        <View className="gap-1 px-1">
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Remédios
          </Text>
          <Texto>
            Nome e horários ficam cifrados no seu aparelho, como o resto do
            autocuidado.
          </Texto>
        </View>
        {protecao.status === "destravado" ? (
          <Plano
            chave={{
              kid: protecao.principal.kid,
              dataKey: protecao.chaves[protecao.principal.kid],
            }}
          />
        ) : (
          <Portao status={protecao.status} />
        )}
      </ScrollView>
    </MyView>
  );
}

/** @param {{ chave: {kid: string, dataKey: Uint8Array} }} props */
function Plano({ chave }) {
  const { remedios } = useMedPlan();
  // Qual remédio está aberto pra edição: o id, "novo", ou nada.
  const [editando, setEditando] = useState(null);

  return (
    <View className="gap-3">
      {remedios.map((r) =>
        editando === r.id ? (
          <Formulario
            key={r.id}
            inicial={r}
            onSalvar={(nome, horarios) => {
              updateMed(r.id, cifrarRemedio(chave, { nome, horarios }));
              setEditando(null);
            }}
            onTirar={() =>
              confirmAction({
                title: "Tirar do plano",
                message: `Tirar ${r.nome} do plano? O que já foi marcado continua no histórico.`,
                confirmLabel: "Tirar",
                onConfirm: () => {
                  removeMed(r.id);
                  setEditando(null);
                },
              })
            }
            onCancelar={() => setEditando(null)}
          />
        ) : (
          <Item
            key={r.id}
            remedio={r}
            onPress={
              r.estado === "aberto" ? () => setEditando(r.id) : undefined
            }
          />
        ),
      )}
      {editando === "novo" ? (
        <Formulario
          inicial={{ nome: "", horarios: [""] }}
          onSalvar={(nome, horarios) => {
            addMed(cifrarRemedio(chave, { nome, horarios }));
            setEditando(null);
          }}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <BotaoPrimario
          rotulo="Adicionar remédio"
          onPress={() => setEditando("novo")}
        />
      )}
    </View>
  );
}

/**
 * @param {{
 *   remedio: {estado: string, nome?: string, horarios?: string[]},
 *   onPress?: () => void,
 * }} props
 */
function Item({ remedio, onPress }) {
  const aberto = remedio.estado === "aberto";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        aberto ? `Alterar ${remedio.nome}` : "Remédio protegido"
      }
      disabled={!onPress}
      onPress={onPress}
      className="gap-1 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4 active:opacity-70"
    >
      <Text
        className="text-base text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {aberto ? remedio.nome : "🔒 Protegido"}
      </Text>
      {aberto ? (
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          {remedio.horarios.join(" · ")}
        </Text>
      ) : (
        <Texto>Não abriu neste aparelho.</Texto>
      )}
    </Pressable>
  );
}

/**
 * Nome e horários de um remédio, novo ou existente.
 *
 * @param {{
 *   inicial: {nome: string, horarios: string[]},
 *   onSalvar: (nome: string, horarios: string[]) => void,
 *   onCancelar: () => void,
 *   onTirar?: () => void,
 * }} props
 */
function Formulario({ inicial, onSalvar, onCancelar, onTirar }) {
  const t = useThemeTokens();
  const [nome, setNome] = useState(inicial.nome);
  const [horarios, setHorarios] = useState(
    inicial.horarios.length ? inicial.horarios : [""],
  );
  const validos = normalizarHorarios(horarios);
  const pronto = nome.trim().length > 0 && validos.length > 0;

  function mudarHorario(i, valor) {
    setHorarios((hs) => hs.map((h, j) => (j === i ? valor : h)));
  }

  return (
    <View className="gap-4 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-5 py-4">
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Rotulo>Nome</Rotulo>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: sertralina 50mg"
          placeholderTextColor={t.iconDim}
          accessibilityLabel="Nome do remédio"
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: t.ink,
            padding: 0,
          }}
        />
      </View>
      <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
        <Rotulo>Horários</Rotulo>
        {horarios.map((h, i) => (
          <View key={i} className="flex-row items-center justify-between gap-3">
            <TimePickerField
              value={h}
              onChangeText={(v) => mudarHorario(i, v)}
              placeholder="08:00"
              accessibilityLabel={`Horário ${i + 1}`}
              style={{
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 24,
                color: t.ink,
                padding: 0,
                minWidth: 80,
              }}
            />
            {horarios.length > 1 ? (
              <Link
                rotulo="tirar"
                accessibilityLabel={`Tirar o horário ${i + 1}`}
                onPress={() =>
                  setHorarios((hs) => hs.filter((_, j) => j !== i))
                }
              />
            ) : null}
          </View>
        ))}
        <Link
          rotulo="+ outro horário"
          accessibilityLabel="Acrescentar outro horário"
          onPress={() => setHorarios((hs) => [...hs, ""])}
        />
      </View>
      <BotaoPrimario
        rotulo="Salvar"
        desativado={!pronto}
        onPress={() => onSalvar(nome.trim(), validos)}
      />
      <View className="flex-row items-center justify-between">
        <Link
          rotulo="Cancelar"
          accessibilityLabel="Cancelar"
          onPress={onCancelar}
        />
        {onTirar ? (
          <Link
            rotulo="Tirar do plano"
            accessibilityLabel="Tirar do plano"
            onPress={onTirar}
          />
        ) : null}
      </View>
    </View>
  );
}

/** @param {{ rotulo: string, accessibilityLabel: string, onPress: () => void }} props */
function Link({ rotulo, accessibilityLabel, onPress }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      className="self-start active:opacity-70"
    >
      <Text
        className="text-sm text-primary dark:text-primary-dark underline"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

function Rotulo({ children }) {
  return (
    <Text
      className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
      style={{ fontFamily: "JetBrainsMono_500Medium" }}
    >
      {children}
    </Text>
  );
}

function Texto({ children }) {
  return (
    <Text
      className="text-sm text-body-secondary dark:text-body-secondary-dark"
      style={{ fontFamily: "Inter_400Regular" }}
    >
      {children}
    </Text>
  );
}
