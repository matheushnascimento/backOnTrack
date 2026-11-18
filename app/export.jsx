import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTable, useValue } from "tinybase/ui-react";

import MyView from "@/components/MyView";
import {
  MIME,
  montarExportacao,
  nomeDoArquivo,
  paraCsv,
  paraJson,
} from "@/constants/dataExport";
import { goBack } from "@/constants/navigation";
import { useThemeTokens } from "@/constants/themeTokens";
import { store } from "@/infra/database";
import { salvarECompartilhar } from "@/infra/exportFile";
import { useProtection } from "@/infra/useProtection";

// Exportação dos dados (#429). Aberta por Ajustes → Exportar dados.
//
// O JSON leva os registros e o que a pessoa configurou; o CSV, uma linha por registro, pra abrir
// numa planilha. No celular o arquivo sai pelo compartilhamento do sistema, e
// na web, por download (`infra/exportFile`).
//
// Campo cifrado só sai aberto. Com a proteção travada, ele fica de fora, e a
// tela diz o quê ANTES de exportar, com o caminho pra destravar. Ver
// `constants/dataExport.js`.

/** @param {unknown} e */
function mensagemDoErro(e) {
  const code = /** @type {{code?: string}} */ (e)?.code;
  if (code === "sem-compartilhar") {
    return "Este aparelho não abriu o compartilhamento de arquivos. Seus dados continuam aqui; tente de novo ou exporte pela versão web.";
  }
  return "Não deu pra gerar o arquivo. Seus dados continuam aqui; tente de novo.";
}

/** @param {{quantidade: number, descricao: string, item: string}} o */
function textoDoOmitido(o) {
  const contavel = o.item === "autocuidado" || o.item === "remedios";
  return contavel ? `${o.descricao} (${o.quantidade})` : o.descricao;
}

export default function Export() {
  const t = useThemeTokens();
  const { chaves } = useProtection();
  const records = useTable("records", store);
  const goals = useTable("goals", store);
  const meds = useTable("meds", store);
  const hygieneSteps = useTable("hygieneSteps", store);
  const displayName = useValue("displayName", store);
  const selfcareGoals = useValue("selfcareGoals", store);
  const bodyWeight = useValue("bodyWeight", store);
  const hygieneTarget = useValue("hygieneTarget", store);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(/** @type {string|null} */ (null));

  const dados = useMemo(
    () => ({
      tabelas: { records, goals, meds, hygieneSteps },
      valores: {
        displayName: String(displayName ?? ""),
        selfcareGoals: String(selfcareGoals ?? ""),
        bodyWeight: String(bodyWeight ?? ""),
        hygieneTarget: String(hygieneTarget ?? ""),
      },
      chaves,
    }),
    [
      records,
      goals,
      meds,
      hygieneSteps,
      displayName,
      selfcareGoals,
      bodyWeight,
      hygieneTarget,
      chaves,
    ],
  );

  // Prévia do que sai, pra dizer o que fica de fora antes de exportar.
  const previa = useMemo(
    () => montarExportacao({ ...dados, agora: Date.now() }),
    [dados],
  );

  /** @param {"json"|"csv"} extensao */
  async function exportar(extensao) {
    setErro(null);
    setOcupado(true);
    try {
      const agora = Date.now();
      const exportacao = montarExportacao({ ...dados, agora });
      await salvarECompartilhar({
        nome: nomeDoArquivo(agora, extensao),
        conteudo:
          extensao === "json" ? paraJson(exportacao) : paraCsv(exportacao),
        mimeType: MIME[extensao],
      });
    } catch (e) {
      console.error("[export] falhou:", e);
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  const total = previa.registros.length;
  // O aviso segue o motivo de cada item, e não o estado geral da proteção: com
  // o pacote principal aberto, um item cifrado com outra chave ainda pode
  // estar travado, e aí o caminho é destravar.
  const travados = previa.omitidos.some((o) => o.motivo === "travado");
  const ilegiveis = previa.omitidos.some((o) => o.motivo === "ilegivel");

  return (
    <MyView
      safe={true}
      className="flex-1 bg-light-background dark:bg-app-dark"
      style={undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => goBack()}
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
            Exportar dados
          </Text>
          <Texto>
            Uma cópia do que você registrou, pra guardar onde quiser. O JSON
            leva os registros, as metas, o plano de remédios e o que mais você
            configurou. O CSV traz uma linha por registro e abre no Excel e no
            Google Planilhas.
          </Texto>
          <Texto>
            {total === 1 ? "1 registro" : `${total} registros`} neste aparelho.
          </Texto>
        </View>

        {previa.omitidos.length > 0 ? (
          <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5">
            <Text
              className="text-lg text-ink dark:text-ink-dark"
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              O que vai ficar de fora
            </Text>
            {travados ? (
              <Texto>
                Alguns dados são cifrados e só saem abertos com a proteção
                destravada neste aparelho.
              </Texto>
            ) : null}
            {ilegiveis ? (
              <Texto>
                Alguns dados cifrados não abriram com a chave deste aparelho, e
                ficam fora do arquivo.
              </Texto>
            ) : null}
            {previa.omitidos.map((o) => (
              <Texto key={`${o.item}-${o.motivo}`}>· {textoDoOmitido(o)}</Texto>
            ))}
            {travados ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir a proteção"
                onPress={() => router.navigate("/protecao")}
                className="self-start active:opacity-70"
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
            ) : null}
          </View>
        ) : null}

        <View className="gap-3">
          <Botao
            rotulo="Exportar JSON"
            desativado={ocupado}
            onPress={() => exportar("json")}
          />
          <Botao
            rotulo="Exportar CSV"
            desativado={ocupado}
            secundario
            onPress={() => exportar("csv")}
          />
        </View>

        {erro ? (
          <Text
            accessibilityRole="alert"
            className="px-1 text-sm text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_500Medium" }}
          >
            {erro}
          </Text>
        ) : null}
      </ScrollView>
    </MyView>
  );
}

/** @param {{children: import("react").ReactNode}} props */
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

/**
 * @param {{rotulo: string, onPress: () => void, desativado?: boolean, secundario?: boolean}} props
 */
// `text-center` no Text, sem `items-center` no pai: Text encolhido ao conteúdo
// corta a última letra da Inter no Android.
function Botao({ rotulo, onPress, desativado, secundario }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: Boolean(desativado) }}
      disabled={desativado}
      onPress={onPress}
      className={`rounded-2xl py-4 ${
        secundario
          ? `border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark ${desativado ? "opacity-50" : "active:opacity-70"}`
          : desativado
            ? "bg-border-strong dark:bg-border-strong-dark"
            : "bg-primary dark:bg-primary-dark active:opacity-70"
      }`}
    >
      <Text
        className={`text-center text-base ${secundario ? "text-primary dark:text-primary-dark" : "text-white dark:text-on-primary-dark"}`}
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
