// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { add } from "@/infra/database";
import getDate from "@/constants/getDate";
import { hhmmToMinutes } from "@/constants/duration";
import { useThemeTokens } from "@/constants/themeTokens";

// UI bespoke da tela de estudo (M5-B fatia 2c, mockup 2a·6).
// Toggle "Feito" full-width com check → duração HH:MM (default "00:00") →
// pill de foco single-select (leitura/curso/prática/revisão/outro, opcional) →
// info card sereno → Registrar.
//
// `focus` é campo novo no modelo (opcional, string) — não quebra registros
// antigos porque loadExtra do genérico ignora e a leitura direta é só no
// bespoke. Sem score/OBS (mockup omite).

const FOCUS = ["leitura", "curso", "prática", "revisão", "outro"];

function parseHHMM(s) {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * @param {{ onAfterAdd?: () => void }} props
 */
export default function StudyBespoke({ onAfterAdd }) {
  const t = useThemeTokens();
  const [studied, setStudied] = useState(true);
  const [duration, setDuration] = useState("");
  const [focus, setFocus] = useState(/** @type {string|null} */ (null));

  const durationMin = useMemo(() => parseHHMM(duration), [duration]);
  const canSave = studied && durationMin != null && durationMin > 0;

  function handleSave() {
    if (!canSave) return;
    add("study", {
      date: getDate().ISOdate,
      unit: "min",
      quantity: hhmmToMinutes(duration),
      studied,
      focus: focus ?? "",
    });
    setStudied(true);
    setDuration("");
    setFocus(null);
    onAfterAdd?.();
  }

  return (
    <View className="gap-4">
      {/* Feito toggle full-width */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Marcar como feito"
        accessibilityState={{ selected: studied }}
        onPress={() => setStudied((v) => !v)}
        className={`flex-row items-center justify-center gap-2.5 rounded-2xl py-4 ${
          studied
            ? "border-2 border-primary dark:border-primary-dark bg-tint-blue dark:bg-tint-blue-dark"
            : "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark"
        }`}
      >
        {studied && (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 6L9 17l-5-5"
              stroke={t.primary}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
        <Text
          className={
            studied
              ? "text-primary dark:text-primary-dark"
              : "text-body-secondary dark:text-body-secondary-dark"
          }
          style={{
            fontFamily: studied ? "Inter_600SemiBold" : "Inter_500Medium",
            fontSize: 15,
          }}
        >
          Feito
        </Text>
      </Pressable>

      {/* Duração */}
      <View>
        <View className="flex-row items-center justify-between rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-5 py-4">
          <View className="gap-0.5">
            <Text
              className="text-xs uppercase tracking-wider text-label dark:text-label-dark"
              style={{ fontFamily: "JetBrainsMono_500Medium" }}
            >
              duração
            </Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="00:45"
              placeholderTextColor={t.iconDim}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              accessibilityLabel="Duração"
              style={{
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 24,
                color: t.ink,
                padding: 0,
                minWidth: 80,
              }}
            />
          </View>
        </View>
        <Text
          className="ml-1 mt-2 text-xs text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_400Regular" }}
        >
          quanto puder é suficiente
        </Text>
      </View>

      {/* Foco (opcional) */}
      <View className="mt-2">
        <Text
          className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
          style={{ fontFamily: "JetBrainsMono_500Medium" }}
        >
          No que estudou
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {FOCUS.map((f) => {
            const selected = focus === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityLabel={`Foco: ${f}`}
                accessibilityState={{ selected }}
                onPress={() => setFocus(selected ? null : f)}
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
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Info card */}
      <View className="rounded-2xl bg-surface-subtle dark:bg-surface-subtle-dark px-4 py-3">
        <Text
          className="text-sm text-body-secondary dark:text-body-secondary-dark"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          15 minutos já contam. Quando puder.
        </Text>
      </View>

      {/* Registrar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar estudo"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={handleSave}
        className={`mt-2 items-center rounded-2xl py-4 ${
          canSave
            ? "bg-primary dark:bg-primary-dark active:opacity-70"
            : "bg-border-strong dark:bg-border-strong-dark"
        }`}
      >
        <Text
          className="text-base text-white dark:text-on-primary-dark"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Registrar
        </Text>
      </Pressable>
    </View>
  );
}
