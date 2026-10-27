// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { parseHHMM } from "@/constants/sleepTimes";
import {
  LIMIAR_DA_ESCADA,
  REGRAS,
  prazoDaRegra,
  textoDaRegra,
} from "@/constants/sleepHygiene";
import { useSleepHygiene } from "@/infra/useSleepHygiene";

import TimeFieldRow from "./TimeFieldRow";

// A frente da tela do sono desde o #396: a regra da higiene do sono que se
// cumpre hoje. Deitar, acordar, duração e qualidade ficam embaixo, opcionais.
//
// Quatro estados, na ordem em que a pessoa passa por eles:
//
//   1. sem método: horário-alvo + escolher a primeira regra
//   2. regra ativa: o texto com o horário de hoje e "cumpri"
//   3. regra formada: escolher a próxima
//   4. as cinco formadas

const TITULO = REGRAS.reduce((o, r) => ({ ...o, [r.key]: r.titulo }), {});

export default function SleepHygieneCard() {
  const h = useSleepHygiene();

  if (!h.configurada) return <Configurar h={h} />;
  return (
    <View className="gap-3 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-5 py-4">
      {h.ativa ? (
        <RegraAtiva h={h} />
      ) : h.completa ? (
        <Corpo
          titulo="As cinco regras viraram rotina"
          texto="O método inteiro está formado. A noite segue registrável aí embaixo, se quiser."
        />
      ) : (
        <Proxima h={h} />
      )}
      <Rodape h={h} />
    </View>
  );
}

function Configurar({ h }) {
  const [alvo, setAlvo] = useState(h.alvo ?? h.sugestao);
  const valido = parseHHMM(alvo) != null;

  return (
    <View className="gap-4 rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-5 py-4">
      <Corpo
        titulo="Higiene do sono"
        texto="O que forma o hábito é o que você faz antes de deitar. Uma regra por vez, contada a partir do horário em que você quer deitar."
      />
      <TimeFieldRow
        label="Quero deitar às"
        value={alvo}
        onChange={setAlvo}
        placeholder="23:00"
        accessibilityLabel="Horário-alvo de deitar"
      />
      <View className="gap-2">
        <Rotulo>Escolha por onde começar</Rotulo>
        {REGRAS.map((r) => (
          <OpcaoDeRegra
            key={r.key}
            regra={r.key}
            alvo={valido ? alvo : null}
            desativado={!valido}
            onPress={() => h.configurar(alvo, r.key)}
          />
        ))}
      </View>
    </View>
  );
}

function RegraAtiva({ h }) {
  const noites = h.sinais?.consistency.hits ?? 0;
  return (
    <>
      <Rotulo>Regra de hoje</Rotulo>
      <Text
        className="text-lg text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {textoDaRegra(h.ativa, h.alvo)}
      </Text>
      <Text
        className="text-sm text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {noites} de {LIMIAR_DA_ESCADA.window} noites nas últimas duas semanas
      </Text>
      {h.cumpridaHoje ? (
        <View className="items-center rounded-2xl border border-border-strong dark:border-border-strong-dark py-4">
          <Text
            className="text-base text-primary dark:text-primary-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Cumprida hoje
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cumpri a regra de hoje"
          onPress={h.cumprir}
          className="items-center rounded-2xl bg-primary dark:bg-primary-dark py-4 active:opacity-70"
        >
          <Text
            className="text-base text-white dark:text-on-primary-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Cumpri
          </Text>
        </Pressable>
      )}
    </>
  );
}

function Proxima({ h }) {
  const ultima = h.conquistadas[h.conquistadas.length - 1];
  return (
    <>
      <Corpo
        titulo={`"${TITULO[ultima]}" virou rotina`}
        texto="Ela sai da lista da noite. Escolha a próxima regra."
      />
      {h.disponiveis.map((regra) => (
        <OpcaoDeRegra
          key={regra}
          regra={regra}
          alvo={h.alvo}
          onPress={() => h.comecar(regra)}
        />
      ))}
    </>
  );
}

function Rodape({ h }) {
  const [editando, setEditando] = useState(false);
  const [alvo, setAlvo] = useState(h.alvo);
  const formadas = h.conquistadas.map((k) => TITULO[k]).join(", ");

  return (
    <View className="gap-2 border-t border-border-subtle dark:border-border-subtle-dark pt-3">
      {formadas && h.ativa ? (
        <Text
          className="text-xs text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          Já formadas: {formadas}
        </Text>
      ) : null}
      {editando ? (
        <View className="gap-2">
          <TimeFieldRow
            label="Deitar às"
            value={alvo}
            onChange={setAlvo}
            placeholder="23:00"
            accessibilityLabel="Horário-alvo de deitar"
          />
          <View className="flex-row gap-2">
            <BotaoPilula
              rotulo="Salvar"
              accessibilityLabel="Salvar horário-alvo"
              desativado={parseHHMM(alvo) == null}
              onPress={() => {
                h.mudarAlvo(alvo);
                setEditando(false);
              }}
            />
            <BotaoPilula
              rotulo="Cancelar"
              accessibilityLabel="Cancelar alteração do horário-alvo"
              onPress={() => setEditando(false)}
            />
          </View>
        </View>
      ) : (
        <View className="flex-row items-center justify-between gap-3">
          <Text
            className="text-sm text-body-secondary dark:text-body-secondary-dark"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Deitar às{" "}
            <Text
              className="text-ink dark:text-ink-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              {h.alvo}
            </Text>
          </Text>
          <BotaoPilula
            rotulo="Alterar"
            accessibilityLabel="Alterar horário-alvo"
            onPress={() => {
              setAlvo(h.alvo);
              setEditando(true);
            }}
          />
        </View>
      )}
    </View>
  );
}

// Ação secundária do cartão. Antes era um texto pequeno no fim da linha
// ("deitar às 23:00 · alterar") e não parecia tocável.
/** @param {{ rotulo: string, accessibilityLabel: string, desativado?: boolean, onPress: () => void }} props */
function BotaoPilula({ rotulo, accessibilityLabel, desativado, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(desativado) }}
      disabled={desativado}
      onPress={onPress}
      className={`rounded-full border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark px-4 py-2 active:opacity-70 ${desativado ? "opacity-40" : ""}`}
    >
      <Text
        className="text-sm text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

/** @param {{ regra: string, alvo: string|null, desativado?: boolean, onPress: () => void }} props */
function OpcaoDeRegra({ regra, alvo, desativado, onPress }) {
  const prazo = alvo ? prazoDaRegra(regra, alvo) : null;
  const quando =
    regra === "0" ? "durante o dia" : prazo ? `depois das ${prazo}` : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Começar por: ${textoDaRegra(regra, alvo ?? "")}`}
      accessibilityState={{ disabled: Boolean(desativado) }}
      disabled={desativado}
      onPress={onPress}
      className="flex-row items-baseline justify-between gap-3 rounded-xl border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark px-4 py-3 active:opacity-70"
    >
      <Text
        className="flex-1 text-sm text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {regra} · {TITULO[regra]}
      </Text>
      <Text
        className="text-xs text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "JetBrainsMono_400Regular" }}
      >
        {quando}
      </Text>
    </Pressable>
  );
}

/** @param {{ titulo: string, texto: string }} props */
function Corpo({ titulo, texto }) {
  return (
    <View className="gap-2">
      <Text
        className="text-base text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {titulo}
      </Text>
      <Text
        className="text-sm text-body-secondary dark:text-body-secondary-dark"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {texto}
      </Text>
    </View>
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
