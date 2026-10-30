// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { rotuloDoTipo } from "@/constants/selfcare";
import {
  MAX_VEZES,
  TIPOS_COM_META,
  cifrarMetas,
  textoDaMeta,
  textoDoProgresso,
} from "@/constants/selfcareGoals";
import { setSelfcareGoals } from "@/infra/database";
import { useSelfcareGoals } from "@/infra/useSelfcareGoals";

import { BotaoPrimario } from "./SelfcareBespoke";

// As metas por tipo do autocuidado (#395), na tela do autocuidado, abaixo dos
// remédios de hoje.
//
// Só os tipos escolhidos aparecem, cada um com meta por dia ou por semana
// (decisões de 30/10). O progresso diz o que foi feito; o que falta não ganha
// cor de cobrança.

const titulo = (tipo) => {
  const r = rotuloDoTipo(tipo);
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/** @param {{ chave: {kid: string, dataKey: Uint8Array} }} props */
export default function SelfcareGoals({ chave }) {
  const { estado, metas, progresso } = useSelfcareGoals();
  const [rascunho, setRascunho] = useState(null);

  if (rascunho) {
    return (
      <Secao>
        <Editor
          rascunho={rascunho}
          onChange={setRascunho}
          onSalvar={() => {
            setSelfcareGoals(cifrarMetas(chave, rascunho));
            setRascunho(null);
          }}
          onCancelar={() => setRascunho(null)}
        />
      </Secao>
    );
  }

  const editar = () => setRascunho(estado === "aberto" ? { ...metas } : {});

  if (estado !== "aberto") {
    return (
      <Secao>
        <Texto>As metas não abriram neste aparelho.</Texto>
        <Link rotulo="Escolher de novo" onPress={editar} />
      </Secao>
    );
  }

  if (progresso.length === 0) {
    return (
      <Secao>
        <Texto>
          Escolha os cuidados que você acompanha, e quantas vezes por dia ou por
          semana.
        </Texto>
        <Link rotulo="Escolher metas" onPress={editar} />
      </Secao>
    );
  }

  return (
    <Secao>
      <View className="overflow-hidden rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark">
        {progresso.map((p, i) => (
          <View
            key={p.tipo}
            className={`gap-0.5 px-4 py-3 ${
              i === 0
                ? ""
                : "border-t border-border-subtle dark:border-border-subtle-dark"
            }`}
          >
            <View className="flex-row items-baseline justify-between gap-3">
              <Text
                className="text-base text-ink dark:text-ink-dark"
                style={{ fontFamily: "Inter_500Medium" }}
              >
                {titulo(p.tipo)}
              </Text>
              <Text
                className="text-xs text-label dark:text-label-dark"
                style={{ fontFamily: "JetBrainsMono_500Medium" }}
              >
                {textoDaMeta(p)}
              </Text>
            </View>
            <Text
              className={`text-sm ${
                p.cumprida
                  ? "text-primary dark:text-primary-dark"
                  : "text-body-secondary dark:text-body-secondary-dark"
              }`}
              style={{ fontFamily: "Inter_400Regular" }}
            >
              {textoDoProgresso(p)}
            </Text>
          </View>
        ))}
      </View>
      <Link rotulo="Mudar metas" onPress={editar} />
    </Secao>
  );
}

/**
 * @param {{
 *   rascunho: Record<string, {vezes: number, periodo: "dia"|"semana"}>,
 *   onChange: (r: object) => void,
 *   onSalvar: () => void,
 *   onCancelar: () => void,
 * }} props
 */
function Editor({ rascunho, onChange, onSalvar, onCancelar }) {
  const mudar = (tipo, meta) => {
    const proximo = { ...rascunho };
    if (meta) proximo[tipo] = meta;
    else delete proximo[tipo];
    onChange(proximo);
  };

  return (
    <View className="gap-4 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-4 py-4">
      {TIPOS_COM_META.map((tipo) => (
        <MetaDoTipo
          key={tipo}
          tipo={tipo}
          meta={rascunho[tipo]}
          onChange={(meta) => mudar(tipo, meta)}
        />
      ))}
      <BotaoPrimario rotulo="Salvar metas" onPress={onSalvar} />
      <View className="items-center">
        <Link rotulo="Cancelar" onPress={onCancelar} />
      </View>
    </View>
  );
}

/**
 * @param {{
 *   tipo: string,
 *   meta?: {vezes: number, periodo: "dia"|"semana"},
 *   onChange: (meta: {vezes: number, periodo: "dia"|"semana"}|null) => void,
 * }} props
 */
function MetaDoTipo({ tipo, meta, onChange }) {
  const acompanha = Boolean(meta);
  const trocarPeriodo = (periodo) =>
    onChange({
      periodo,
      vezes: Math.min(meta.vezes, MAX_VEZES[periodo]),
    });

  return (
    <View className="gap-3 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4 py-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acompanha }}
        accessibilityLabel={`Acompanhar ${rotuloDoTipo(tipo)}`}
        onPress={() =>
          onChange(acompanha ? null : { vezes: 1, periodo: "semana" })
        }
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <Text
          className="flex-1 text-base text-ink dark:text-ink-dark"
          style={{ fontFamily: "Inter_500Medium" }}
        >
          {titulo(tipo)}
        </Text>
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            acompanha
              ? "bg-primary dark:bg-primary-dark"
              : "border-2 border-border-strong dark:border-border-strong-dark"
          }`}
        >
          {acompanha ? (
            <Text
              className="text-xs text-white dark:text-on-primary-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              ✓
            </Text>
          ) : null}
        </View>
      </Pressable>
      {acompanha ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Passo
              simbolo="−"
              rotulo="Uma vez a menos"
              desativado={meta.vezes <= 1}
              onPress={() => onChange({ ...meta, vezes: meta.vezes - 1 })}
            />
            <Text
              className="text-center text-base text-ink dark:text-ink-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium", minWidth: 24 }}
            >
              {meta.vezes}
            </Text>
            <Passo
              simbolo="+"
              rotulo="Uma vez a mais"
              desativado={meta.vezes >= MAX_VEZES[meta.periodo]}
              onPress={() => onChange({ ...meta, vezes: meta.vezes + 1 })}
            />
          </View>
          <View className="flex-row gap-1 rounded-full bg-surface-subtle dark:bg-surface-subtle-dark p-1">
            {["dia", "semana"].map((periodo) => (
              <Pressable
                key={periodo}
                accessibilityRole="radio"
                accessibilityState={{ checked: meta.periodo === periodo }}
                accessibilityLabel={`Por ${periodo}`}
                onPress={() => trocarPeriodo(periodo)}
                className={`rounded-full px-3 py-1 active:opacity-70 ${
                  meta.periodo === periodo ? "bg-white dark:bg-card-dark" : ""
                }`}
              >
                <Text
                  className={`text-sm ${
                    meta.periodo === periodo
                      ? "text-ink dark:text-ink-dark"
                      : "text-body-secondary dark:text-body-secondary-dark"
                  }`}
                  style={{ fontFamily: "Inter_500Medium" }}
                >
                  por {periodo}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * @param {{
 *   simbolo: string,
 *   rotulo: string,
 *   desativado: boolean,
 *   onPress: () => void,
 * }} props
 */
function Passo({ simbolo, rotulo, desativado, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desativado }}
      disabled={desativado}
      onPress={onPress}
      hitSlop={6}
      className={`h-8 w-8 items-center justify-center rounded-full border border-border-strong dark:border-border-strong-dark active:opacity-70 ${
        desativado ? "opacity-30" : ""
      }`}
    >
      <Text
        className="text-base text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {simbolo}
      </Text>
    </Pressable>
  );
}

function Secao({ children }) {
  return (
    <View className="gap-3">
      <Text
        className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        Metas
      </Text>
      {children}
    </View>
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

/** @param {{ rotulo: string, onPress: () => void }} props */
function Link({ rotulo, onPress }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={rotulo}
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
