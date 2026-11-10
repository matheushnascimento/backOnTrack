import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  DEFAULT_GOALS,
  GOAL_INPUT_UNIT,
  formatGoal,
  goalInputValue,
  goalLimitsHint,
  parseGoalInput,
} from "@/constants/goals";
import { useThemeTokens } from "@/constants/themeTokens";
import { aguaPeloPeso, parsePeso, pesoNoCampo } from "@/constants/bodyWeight";
import { setGoal } from "@/infra/database";
import { useBodyWeight } from "@/infra/useBodyWeight";
import { router } from "expo-router";

// Edição da meta diária de um hábito (#423), aberta pela linha em Ajustes →
// Metas do dia. Mesmo formato do modal do nome: fundo irmão do cartão, porque
// no web o fundo como pai fechava o modal ao tocar no campo (#415).
//
// A frase sobre os dias que já passaram é o ponto da tela. Não há histórico de
// metas, então a nova recalcula a janela inteira, e subir a meta pode
// devolver um hábito à construção. A pessoa precisa saber disso antes de
// salvar, e não descobrir pela Home.
//
// Na água, o peso sugere a meta (35 ml por kg, ver constants/bodyWeight.js).
// Ele preenche o campo e não salva sozinho: a meta continua sendo o número
// que a pessoa confirma. O peso vai junto no Salvar, cifrado.

/**
 * @param {{
 *   metric: string,
 *   label: string,
 *   current: number | null,
 *   onClose: () => void,
 * }} props
 */
export default function GoalEditModal({ metric, label, current, onClose }) {
  const t = useThemeTokens();
  const [texto, setTexto] = useState(goalInputValue(metric, current));
  const valor = parseGoalInput(metric, texto);
  const padrao =
    DEFAULT_GOALS[/** @type {keyof typeof DEFAULT_GOALS} */ (metric)];
  const peso = useBodyWeight();
  // `null` enquanto a pessoa não mexe: o peso guardado chega depois do
  // primeiro render, quando o cofre de chaves termina de abrir.
  const [pesoTexto, setPesoTexto] = useState(/** @type {string|null} */ (null));
  const pesoCampo = pesoTexto ?? pesoNoCampo(peso.kg);
  const pesoKg = parsePeso(pesoCampo);
  const comPeso = metric === "water" && peso.protecao === "destravado";
  const pesoMudou = comPeso && pesoKg != null && pesoKg !== peso.kg;
  const mudou = valor != null && (valor !== current || pesoMudou);

  function salvar() {
    if (valor == null) return;
    if (pesoMudou && pesoKg != null) peso.salvar(pesoKg);
    if (setGoal(metric, valor)) onClose();
  }

  function abrirProtecao() {
    onClose();
    router.navigate("/protecao");
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.4)" },
          ]}
        />
        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: 20,
            padding: 20,
            gap: 14,
            maxWidth: 360,
            width: "100%",
          }}
        >
          <Text
            style={{
              color: t.ink,
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
            }}
          >
            Meta diária de {label.toLowerCase()}
          </Text>
          <Text
            style={{
              color: t.bodySecondary,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: -4,
            }}
          >
            O nível passa a usar a meta nova também nos dias que já passaram.
          </Text>

          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <TextInput
              value={texto}
              onChangeText={setTexto}
              keyboardType={metric === "water" ? "decimal-pad" : "number-pad"}
              autoFocus
              maxLength={4}
              accessibilityLabel={`Meta de ${label.toLowerCase()}`}
              onSubmitEditing={salvar}
              style={{
                flex: 1,
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 24,
                color: t.ink,
                borderBottomWidth: 1,
                borderBottomColor: t.borderSubtle,
                paddingVertical: 6,
              }}
            />
            <Text
              style={{
                color: t.label,
                fontFamily: "JetBrainsMono_500Medium",
                fontSize: 16,
              }}
            >
              {
                GOAL_INPUT_UNIT[
                  /** @type {keyof typeof GOAL_INPUT_UNIT} */ (metric)
                ]
              }
            </Text>
          </View>

          <Text
            style={{
              // Sem vermelho: ele é do destrutivo (regra 2 do Turno 3). Valor
              // fora dos limites só escurece a dica e trava o Salvar.
              color: texto && valor == null ? t.ink : t.label,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: -6,
            }}
          >
            {goalLimitsHint(metric)} Padrão: {formatGoal(metric, padrao)}.
          </Text>

          {metric === "water" ? (
            <View
              style={{
                gap: 8,
                borderTopWidth: 1,
                borderTopColor: t.borderSubtle,
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  color: t.label,
                  fontFamily: "JetBrainsMono_500Medium",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Pelo peso
              </Text>
              {comPeso ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={pesoCampo}
                      onChangeText={setPesoTexto}
                      keyboardType="decimal-pad"
                      maxLength={5}
                      placeholder="70"
                      placeholderTextColor={t.iconDim}
                      accessibilityLabel="Peso em quilos"
                      style={{
                        width: 72,
                        fontFamily: "JetBrainsMono_500Medium",
                        fontSize: 18,
                        color: t.ink,
                        borderBottomWidth: 1,
                        borderBottomColor: t.borderSubtle,
                        paddingVertical: 4,
                      }}
                    />
                    <Text
                      style={{
                        color: t.label,
                        fontFamily: "JetBrainsMono_500Medium",
                        fontSize: 14,
                      }}
                    >
                      kg
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Usar a meta calculada pelo peso"
                      accessibilityState={{ disabled: pesoKg == null }}
                      disabled={pesoKg == null}
                      onPress={() => {
                        if (pesoKg == null) return;
                        setTexto(goalInputValue("water", aguaPeloPeso(pesoKg)));
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: t.tintBlue,
                        opacity: pesoKg == null ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: t.primary,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                        }}
                      >
                        {pesoKg == null
                          ? "Usar"
                          : `Usar ${formatGoal("water", aguaPeloPeso(pesoKg))}`}
                      </Text>
                    </Pressable>
                  </View>
                  <Text
                    style={{
                      color: t.label,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                    }}
                  >
                    35 ml por kg, uma regra prática. O peso fica cifrado, como
                    os remédios.
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      color: t.bodySecondary,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                    }}
                  >
                    O peso é dado de saúde e só viaja cifrado.{" "}
                    {peso.protecao === "travado"
                      ? "Destrave a proteção pra calcular a meta por ele."
                      : "Crie a proteção pra calcular a meta por ele."}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir a proteção"
                    onPress={abrirProtecao}
                  >
                    <Text
                      style={{
                        color: t.primary,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                      }}
                    >
                      Abrir a proteção ›
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onClose}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: t.bodySecondary,
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                }}
              >
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Salvar meta"
              accessibilityState={{ disabled: !mudou }}
              disabled={!mudou}
              onPress={salvar}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: mudou ? t.primary : t.borderStrong,
              }}
            >
              <Text
                style={{
                  color: t.onPrimary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                }}
              >
                Salvar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
