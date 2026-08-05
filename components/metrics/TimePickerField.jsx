// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";

import { useThemeTokens } from "@/constants/themeTokens";

// Campo de horário com face de relógio analógico tátil como controle primário
// (bed/wake, duração, hora de início). Toque no display abre um modal com o
// relógio: anel externo é 1-12, interno é 13-00; minutos aparecem em 5-em-5
// depois que o usuário escolhe a hora. Fallback textual embaixo cobre entrada
// precisa (minuto 07, por exemplo) — texto aceito mas não é a primeira opção.
//
// Sem dep nativa nova: puro SVG + Pressable. Continua chegando via OTA.

const SIZE = 260;
const CENTER = SIZE / 2;
const OUTER_R = 108; // anel externo (hours 1-12 ou minutos 0-55)
const INNER_R = 74; // anel interno (hours 13-00)
const TARGET_R = 20; // raio do alvo tocável em torno de cada mark

// Converte ângulo em graus (0° = topo, cresce horário) pra coordenada cartesiana.
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Máscara HH:MM suave pro fallback textual — mesmo comportamento do fatia
// anterior: digits only, colon automático, clamp 23/59.
function maskHHMM(text) {
  const digits = String(text ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);
  let clamped = digits;
  if (clamped.length >= 2) {
    const h = parseInt(clamped.slice(0, 2), 10);
    if (h > 23) clamped = "23" + clamped.slice(2);
  }
  if (clamped.length === 4) {
    const mm = parseInt(clamped.slice(2, 4), 10);
    if (mm > 59) clamped = clamped.slice(0, 2) + "59";
  }
  if (clamped.length <= 2) return clamped;
  return `${clamped.slice(0, 2)}:${clamped.slice(2)}`;
}

/**
 * @param {{
 *   value: string,
 *   onChangeText: (v: string) => void,
 *   placeholder?: string,
 *   accessibilityLabel?: string,
 *   style?: any,
 * }} props
 */
export default function TimePickerField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
}) {
  const t = useThemeTokens();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState(/** @type {"hour"|"minute"} */ ("hour"));

  const [h, m] = parseHHMM(value);
  const displayText = value || placeholder || "--:--";
  const isEmpty = !value;

  function open() {
    setMode("hour");
    setShow(true);
  }
  function dismiss() {
    setShow(false);
  }

  function pickHour(newH) {
    onChangeText(`${pad2(newH)}:${pad2(m)}`);
    setMode("minute");
  }
  function pickMinute(newM) {
    onChangeText(`${pad2(h)}:${pad2(newM)}`);
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={open}
      >
        <Text style={[style, isEmpty && { color: t.iconDim }]}>
          {displayText}
        </Text>
      </Pressable>

      {show && (
        <Modal
          transparent
          animationType="fade"
          visible={show}
          onRequestClose={dismiss}
        >
          <Pressable
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.4)",
              padding: 16,
            }}
            onPress={dismiss}
          >
            <View
              onStartShouldSetResponder={() => true}
              style={{
                backgroundColor: t.bgCard,
                borderRadius: 20,
                padding: 20,
                gap: 12,
                alignItems: "center",
                maxWidth: 360,
                width: "100%",
              }}
            >
              {/* Display grande + seletor de modo */}
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <ModeToggle
                  active={mode === "hour"}
                  onPress={() => setMode("hour")}
                  label={pad2(h)}
                  t={t}
                />
                <Text
                  style={{
                    color: t.ink,
                    fontFamily: "JetBrainsMono_500Medium",
                    fontSize: 44,
                    lineHeight: 52,
                  }}
                >
                  :
                </Text>
                <ModeToggle
                  active={mode === "minute"}
                  onPress={() => setMode("minute")}
                  label={pad2(m)}
                  t={t}
                />
              </View>

              <Text
                style={{
                  color: t.label,
                  fontFamily: "JetBrainsMono_400Regular",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {mode === "hour" ? "toque na hora" : "toque no minuto (5 em 5)"}
              </Text>

              {mode === "hour" ? (
                <HourFace value={h} onPick={pickHour} t={t} />
              ) : (
                <MinuteFace value={m} onPick={pickMinute} t={t} />
              )}

              {/* Fallback textual */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingTop: 4,
                }}
              >
                <Text
                  style={{
                    color: t.label,
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                  }}
                >
                  ou
                </Text>
                <TextInput
                  value={value}
                  onChangeText={(next) => onChangeText(maskHHMM(next))}
                  placeholder="HH:MM"
                  placeholderTextColor={t.iconDim}
                  keyboardType="numeric"
                  maxLength={5}
                  accessibilityLabel="Digitar horário"
                  style={{
                    fontFamily: "JetBrainsMono_500Medium",
                    fontSize: 16,
                    color: t.ink,
                    borderBottomWidth: 1,
                    borderBottomColor: t.borderSubtle,
                    minWidth: 80,
                    paddingVertical: 4,
                    textAlign: "center",
                  }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Concluir"
                onPress={dismiss}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: t.primary,
                  alignSelf: "stretch",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    color: t.onPrimary,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                  }}
                >
                  Concluir
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

/** @param {string} v @returns {[number, number]} */
function parseHHMM(v) {
  const [hh = "0", mm = "0"] = String(v ?? "").split(":");
  return [Number(hh) || 0, Number(mm) || 0];
}

/**
 * @param {{ active: boolean, onPress: () => void, label: string, t: any }} props
 */
function ModeToggle({ active, onPress, label, t }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Text
        style={{
          color: active ? t.primary : t.ink,
          fontFamily: active
            ? "JetBrainsMono_500Medium"
            : "JetBrainsMono_400Regular",
          fontSize: 44,
          lineHeight: 52,
          opacity: active ? 1 : 0.55,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * @param {{ value: number, onPick: (h: number) => void, t: any }} props
 */
function HourFace({ value, onPick, t }) {
  // Anel externo: horas 1..12 (12 fica no topo). Anel interno: 13..24 nas
  // mesmas 12 posições (24 = topo, 13 = 30°, etc). Cada hour marca uma
  // posição angular de (hourIndex * 30°).
  const outerHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // top-anchored
  const innerHours = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  // Ângulo de destaque baseado no value atual (0-23).
  const highlightRing = value >= 13 || value === 0 ? INNER_R : OUTER_R;
  const highlightAngle = (value % 12) * 30;
  const sel = polar(CENTER, CENTER, highlightRing, highlightAngle);

  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={CENTER} cy={CENTER} r={CENTER - 10} fill={t.surfaceSubtle} />
      {/* Linha da hora selecionada */}
      <Line
        x1={CENTER}
        y1={CENTER}
        x2={sel.x}
        y2={sel.y}
        stroke={t.primary}
        strokeWidth={2}
      />
      <Circle cx={CENTER} cy={CENTER} r={4} fill={t.primary} />
      {outerHours.map((hr, i) => (
        <ClockMark
          key={`o-${hr}`}
          r={OUTER_R}
          angle={i * 30}
          label={String(hr)}
          selected={value === hr || (hr === 12 && value === 12)}
          onPress={() => onPick(hr === 12 ? 12 : hr)}
          t={t}
        />
      ))}
      {innerHours.map((hr, i) => (
        <ClockMark
          key={`i-${hr}`}
          r={INNER_R}
          angle={i * 30}
          label={hr === 0 ? "00" : String(hr)}
          selected={value === hr}
          onPress={() => onPick(hr)}
          t={t}
          small
        />
      ))}
    </Svg>
  );
}

/**
 * @param {{ value: number, onPick: (m: number) => void, t: any }} props
 */
function MinuteFace({ value, onPick, t }) {
  // 12 marcas em 5-em-5: 0, 5, 10 ... 55. 0 no topo.
  const marks = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  // Ângulo de destaque: para valores fora dos 5-em-5, mostra proporcional.
  const highlightAngle = (value / 60) * 360;
  const sel = polar(CENTER, CENTER, OUTER_R, highlightAngle);
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={CENTER} cy={CENTER} r={CENTER - 10} fill={t.surfaceSubtle} />
      <Line
        x1={CENTER}
        y1={CENTER}
        x2={sel.x}
        y2={sel.y}
        stroke={t.primary}
        strokeWidth={2}
      />
      <Circle cx={CENTER} cy={CENTER} r={4} fill={t.primary} />
      {marks.map((mk, i) => (
        <ClockMark
          key={`m-${mk}`}
          r={OUTER_R}
          angle={i * 30}
          label={pad2(mk)}
          selected={value === mk}
          onPress={() => onPick(mk)}
          t={t}
        />
      ))}
    </Svg>
  );
}

/**
 * @param {{
 *   r: number, angle: number, label: string,
 *   selected: boolean, onPress: () => void,
 *   t: any, small?: boolean,
 * }} props
 */
function ClockMark({ r, angle, label, selected, onPress, t, small }) {
  const p = polar(CENTER, CENTER, r, angle);
  const targetR = TARGET_R;
  const textSize = small ? 12 : 14;
  return (
    <G onPress={onPress}>
      <Circle
        cx={p.x}
        cy={p.y}
        r={targetR}
        fill={selected ? t.primary : "transparent"}
      />
      <SvgText
        x={p.x}
        y={p.y + textSize / 3}
        fontSize={textSize}
        fontFamily="JetBrainsMono_500Medium"
        fill={selected ? t.onPrimary : t.ink}
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </G>
  );
}
