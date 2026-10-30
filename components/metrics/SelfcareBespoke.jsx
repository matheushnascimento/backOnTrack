// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import getDate from "@/constants/getDate";
import {
  SELFCARE_TIPOS,
  cifrarRegistro,
  lerRegistro,
} from "@/constants/selfcare";
import { useThemeTokens } from "@/constants/themeTokens";
import { add, getById, update } from "@/infra/database";
import { useProtection } from "@/infra/useProtection";

import MedPlanToday from "./MedPlanToday";
import SelfcareGoals from "./SelfcareGoals";

// Autocuidado, a 6ª métrica (#374, fatia 3a).
//
// O tipo e a nota vão cifrados ponta a ponta, então registrar exige a chave
// destrancada neste aparelho. Sem proteção criada, ou travada, a tela leva até
// ela em vez de oferecer um formulário que não teria como salvar. Ver
// constants/selfcare.js pro que vai em claro.

/**
 * @param {{ onAfterAdd?: () => void, recordId?: string }} props
 */
export default function SelfcareBespoke({ onAfterAdd, recordId }) {
  const protecao = useProtection();

  if (protecao.status !== "destravado") {
    return <Portao status={protecao.status} />;
  }
  const chave = {
    kid: protecao.principal.kid,
    dataKey: protecao.chaves[protecao.principal.kid],
  };
  return recordId ? (
    <SelfcareEdit
      recordId={recordId}
      chave={chave}
      chaves={protecao.chaves}
      onAfterSave={onAfterAdd}
    />
  ) : (
    <SelfcareCreate chave={chave} onAfterAdd={onAfterAdd} />
  );
}

/**
 * Leva até a proteção quando ela não existe ou está travada. Exportado pra
 * tela do plano de remédios, que tem a mesma exigência.
 *
 * @param {{ status: "sem-protecao"|"travado" }} props
 */
export function Portao({ status }) {
  const criar = status === "sem-protecao";
  return (
    <View className="gap-4">
      <View className="gap-2 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-5 py-4">
        <Text
          className="text-base text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {criar
            ? "Seus registros aqui são protegidos"
            : "Destrave pra registrar"}
        </Text>
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {criar
            ? "O que você registra no autocuidado é cifrado no seu aparelho antes de ir pro servidor, e nem quem administra o app consegue ler. Pra isso, crie uma senha de proteção."
            : "Digite sua senha de proteção uma vez neste aparelho."}
        </Text>
      </View>
      <BotaoPrimario
        rotulo={criar ? "Criar proteção" : "Destravar"}
        onPress={() => router.navigate("/protecao")}
      />
    </View>
  );
}

/** @param {{ chave: object, onAfterAdd?: () => void }} props */
function SelfcareCreate({ chave, onAfterAdd }) {
  const [tipo, setTipo] = useState(null);
  const [nota, setNota] = useState("");

  function handleSave() {
    if (!tipo) return;
    add("selfcare", {
      date: getDate().ISOdate,
      unit: "registro",
      quantity: 1,
      // Vazia de propósito: a coluna `note` viaja em claro. A nota vai dentro
      // do campo cifrado.
      note: "",
      protegido: cifrarRegistro(chave, { tipo, nota }),
    });
    setTipo(null);
    setNota("");
    onAfterAdd?.();
  }

  return (
    <View className="gap-6">
      <MedPlanToday chave={chave} />
      <SelfcareGoals chave={chave} />
      <View className="gap-4">
        <Tipos valor={tipo} onChange={setTipo} />
        <Nota valor={nota} onChange={setNota} />
        <BotaoPrimario
          rotulo="Registrar"
          onPress={handleSave}
          desativado={!tipo}
        />
      </View>
    </View>
  );
}

/**
 * @param {{
 *   recordId: string,
 *   chave: object,
 *   chaves: Record<string, Uint8Array>,
 *   onAfterSave?: () => void,
 * }} props
 */
function SelfcareEdit({ recordId, chave, chaves, onAfterSave }) {
  const [tipo, setTipo] = useState(null);
  const [nota, setNota] = useState("");
  // O "tomei" de um remédio do plano (#392). Não aparece na edição, mas tem
  // que voltar no campo cifrado, que é reescrito inteiro.
  const [remedio, setRemedio] = useState(null);
  const [estado, setEstado] = useState("carregando"); // carregando | aberto | travado | ilegivel

  useEffect(() => {
    const r = getById(recordId);
    if (!r) return;
    const lido = lerRegistro(chaves, r);
    setEstado(lido.estado);
    if (lido.estado === "aberto") {
      setTipo(lido.tipo);
      setNota(lido.nota);
      setRemedio(lido.remedio ?? null);
    }
  }, [recordId, chaves]);

  if (estado === "travado") return <Portao status="travado" />;
  if (estado === "ilegivel") {
    return (
      <Text
        className="text-sm text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        Este registro não pôde ser lido, então não dá pra editar. Dá pra excluir
        pelo histórico.
      </Text>
    );
  }

  function handleSave() {
    if (!tipo) return;
    // O `update` RECONSTRÓI o details (#328, #332): o campo cifrado tem que
    // vir aqui. Recifra com a chave principal, que é pra onde todo aparelho
    // converge (ver constants/e2eKeyring.js).
    update(recordId, {
      unit: "registro",
      quantity: 1,
      note: "",
      // Um "tomei" que deixou de ser remédio perde o vínculo com o plano.
      protegido: cifrarRegistro(chave, {
        tipo,
        nota,
        remedio: tipo === "remedio" ? remedio : null,
      }),
    });
    onAfterSave?.();
  }

  return (
    <View className="gap-4">
      <Tipos valor={tipo} onChange={setTipo} />
      <Nota valor={nota} onChange={setNota} />
      <BotaoPrimario
        rotulo="Salvar alterações"
        onPress={handleSave}
        desativado={!tipo}
      />
    </View>
  );
}

/** @param {{ valor: string|null, onChange: (v: string) => void }} props */
function Tipos({ valor, onChange }) {
  return (
    <View>
      <Text
        className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        O que foi
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {SELFCARE_TIPOS.map(({ key, label }) => {
          const selected = valor === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Tipo: ${label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(key)}
              className={`rounded-full px-3.5 py-2 ${
                selected
                  ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
                  : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
              }`}
            >
              <Text
                className={`text-xs ${selected ? "text-primary dark:text-primary-dark" : "text-body-secondary dark:text-body-secondary-dark"}`}
                style={{
                  fontFamily: selected
                    ? "Inter_600SemiBold"
                    : "Inter_400Regular",
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** @param {{ valor: string, onChange: (v: string) => void }} props */
function Nota({ valor, onChange }) {
  const t = useThemeTokens();
  return (
    <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        Nota (opcional)
      </Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Também vai cifrada."
        placeholderTextColor={t.iconDim}
        multiline
        accessibilityLabel="Nota do autocuidado"
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: t.ink,
          padding: 0,
          minHeight: 44,
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}

/** @param {{ rotulo: string, onPress: () => void, desativado?: boolean }} props */
export function BotaoPrimario({ rotulo, onPress, desativado }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: Boolean(desativado) }}
      disabled={desativado}
      onPress={onPress}
      className={`mt-2 items-center rounded-2xl py-4 ${
        desativado
          ? "bg-border-strong dark:bg-border-strong-dark"
          : "bg-primary dark:bg-primary-dark active:opacity-70"
      }`}
    >
      <Text
        className="text-base text-white dark:text-on-primary-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
