// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { TextInput } from "react-native";

import { useThemeTokens } from "@/constants/themeTokens";

// Input mascarado pra HH:MM (bed/wake, duração, hora de início). Filtra
// digits, insere ":" automaticamente após 2 dígitos, e faz clamp de faixa
// (hora 0-23, minuto 0-59) no próprio evento — o usuário literalmente não
// consegue digitar valor inválido.
//
// Sem dep nativa nova de propósito: um `<input type="time">` na web + um
// picker nativo (`@react-native-community/datetimepicker`) forçaria bump de
// APK. Máscara pura em TextInput funciona em RN e web sem novos assets, com
// o mesmo comportamento nas duas plataformas.
//
// Aceita string vazia (bom pra campos opcionais como startTime do exercício):
// nada de forçar ":" se o usuário apaga tudo. O `canSave` de cada bespoke
// continua sendo a última linha de defesa via `parseHHMM`.

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
    const m = parseInt(clamped.slice(2, 4), 10);
    if (m > 59) clamped = clamped.slice(0, 2) + "59";
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
export default function TimeInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
}) {
  const t = useThemeTokens();
  function handleChange(text) {
    onChangeText(maskHHMM(text));
  }
  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder}
      placeholderTextColor={t.iconDim}
      keyboardType="numeric"
      maxLength={5}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
}
