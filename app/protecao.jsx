// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MyView from "@/components/MyView";
import { confirmAction } from "@/constants/dialogs";
import { validarSenhaNova } from "@/constants/e2eKeyring";
import { goBack } from "@/constants/navigation";
import { useThemeTokens } from "@/constants/themeTokens";
import { useProtection } from "@/infra/useProtection";

// Proteção dos dados sensíveis (#388, fatia 2 da #374).
//
// Três estados, decididos pelo `useProtection`:
//
// - sem proteção: criar a senha, e então mostrar o código de recuperação UMA
//   vez, com a pessoa confirmando que guardou antes de sair;
// - travado (aparelho novo, ou travado de propósito): destrancar com a senha,
//   ou recuperar com o código escolhendo senha nova;
// - destravado: trocar a senha ou travar este aparelho.
//
// Até a fatia 3 a tela só abre pela área de desenvolvimento de Ajustes: sem o
// autocuidado, ainda não há nada pra proteger.

/** Mensagem pra pessoa a partir do erro do núcleo. */
function mensagemDoErro(e, contexto) {
  switch (e?.code) {
    case "nao-destrancou":
      return contexto === "codigo"
        ? "Esse código não abre a proteção desta conta."
        : "Senha incorreta.";
    case "codigo-invalido":
      return "O código tem 32 caracteres, em 8 grupos de 4.";
    case "sem-webcrypto":
      return "Este navegador não permite criptografia nesta página. Use o app, ou o site em https.";
    default:
      return "Algo deu errado. Tente de novo.";
  }
}

export default function Protecao() {
  const t = useThemeTokens();
  const protecao = useProtection();
  // Depois de criar, o código fica aqui até a pessoa confirmar que guardou.
  // Sair da tela antes disso perde o código, e é por isso que o botão de
  // concluir só libera com a confirmação.
  const [codigoNovo, setCodigoNovo] = useState(null);

  return (
    <MyView safe={true} className="flex-1 bg-light-background dark:bg-app-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Voltar t={t} />
        <View className="gap-1 px-1">
          <Text
            className="text-2xl text-ink dark:text-ink-dark"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            Proteção dos dados sensíveis
          </Text>
          <Texto>
            Registros sensíveis, como remédios, são cifrados no seu aparelho
            antes de irem pro servidor. Nem quem administra o app consegue
            lê-los.
          </Texto>
        </View>

        {codigoNovo ? (
          <CodigoDeRecuperacao
            codigo={codigoNovo}
            onConcluir={() => setCodigoNovo(null)}
          />
        ) : protecao.status === "sem-protecao" ? (
          <Criar protecao={protecao} onCriado={setCodigoNovo} />
        ) : protecao.status === "travado" ? (
          <Destravar protecao={protecao} />
        ) : (
          <Destravado protecao={protecao} />
        )}
      </ScrollView>
    </MyView>
  );
}

/** @param {{ protecao: ReturnType<typeof useProtection>, onCriado: (codigo: string) => void }} props */
function Criar({ protecao, onCriado }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(null);
  const [criando, setCriando] = useState(false);

  if (protecao.criacao.motivo === "sem-login") {
    return (
      <View className="gap-4">
        <Cartao titulo="Entre na sua conta primeiro">
          A proteção vive na sua conta, e é assim que ela chega aos seus outros
          aparelhos.
        </Cartao>
        <Botao rotulo="Entrar" onPress={() => router.navigate("/login")} />
      </View>
    );
  }
  if (protecao.criacao.motivo === "sem-sync") {
    // Criar sem sync poderia gerar uma segunda chave enquanto a da conta ainda
    // está a caminho. Ver `podeCriar` em constants/e2eKeyring.js.
    return (
      <Cartao titulo="Esperando a conexão">
        A proteção só pode ser criada com o app conectado ao servidor. Assim ela
        não duplica uma que você já tenha criado em outro aparelho.
      </Cartao>
    );
  }

  async function handleCriar() {
    const problema = validarSenhaNova(senha, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setCriando(true);
    try {
      onCriado(await protecao.criar(senha));
    } catch (e) {
      console.error("[protecao] criar falhou:", e);
      setErro(mensagemDoErro(e));
    } finally {
      setCriando(false);
    }
  }

  return (
    <View className="gap-4">
      <Cartao titulo="Crie uma senha de proteção">
        Ela é diferente do login, e é pedida uma vez em cada aparelho novo. Se
        você esquecer a senha e também perder o código de recuperação, os
        registros protegidos ficam ilegíveis pra sempre: ninguém consegue
        recuperar, nem nós.
      </Cartao>
      <Campo rotulo="Senha" valor={senha} onChange={setSenha} senha />
      <Campo
        rotulo="Repita a senha"
        valor={confirmacao}
        onChange={setConfirmacao}
        senha
      />
      {erro ? <Erro>{erro}</Erro> : null}
      <Botao
        rotulo={criando ? "Criando…" : "Criar proteção"}
        onPress={handleCriar}
        desativado={criando || !senha}
      />
    </View>
  );
}

/** @param {{ codigo: string, onConcluir: () => void }} props */
function CodigoDeRecuperacao({ codigo, onConcluir }) {
  const [guardou, setGuardou] = useState(false);
  return (
    <View className="gap-4">
      <Cartao titulo="Guarde seu código de recuperação">
        Ele destrava a proteção se você esquecer a senha. Ele aparece só agora:
        anote ou guarde num gerenciador de senhas antes de continuar.
      </Cartao>
      {/* Selecionável em vez de botão de copiar: o código não vai pra área de
          transferência por padrão, onde outros apps conseguem ler. */}
      <Text
        selectable
        accessibilityLabel={`Código de recuperação: ${codigo}`}
        className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4 py-5 text-center text-ink dark:text-ink-dark"
        style={{
          fontFamily: "JetBrainsMono_500Medium",
          fontSize: 18,
          lineHeight: 30,
        }}
      >
        {codigo}
      </Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: guardou }}
        onPress={() => setGuardou((v) => !v)}
        className="flex-row items-center gap-3 px-1 active:opacity-70"
      >
        <View
          className={`h-5 w-5 items-center justify-center rounded border-2 ${
            guardou
              ? "border-primary dark:border-primary-dark bg-primary dark:bg-primary-dark"
              : "border-border-strong dark:border-border-strong-dark"
          }`}
        >
          {guardou ? (
            <Text className="text-xs text-white dark:text-on-primary-dark">
              ✓
            </Text>
          ) : null}
        </View>
        <Texto>Guardei o código num lugar seguro</Texto>
      </Pressable>
      <Botao rotulo="Concluir" onPress={onConcluir} desativado={!guardou} />
    </View>
  );
}

/** @param {{ protecao: ReturnType<typeof useProtection> }} props */
function Destravar({ protecao }) {
  const [modo, setModo] = useState("senha"); // senha | codigo
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function rodar(fn, contexto) {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      console.error("[protecao] destravar falhou:", e);
      setErro(mensagemDoErro(e, contexto));
    } finally {
      setOcupado(false);
    }
  }

  if (modo === "codigo") {
    return (
      <View className="gap-4">
        <Cartao titulo="Recuperar com o código">
          Digite o código de recuperação e escolha uma senha nova.
        </Cartao>
        <Campo
          rotulo="Código de recuperação"
          valor={codigo}
          onChange={setCodigo}
          mono
        />
        <Campo rotulo="Senha nova" valor={nova} onChange={setNova} senha />
        <Campo
          rotulo="Repita a senha nova"
          valor={confirmacao}
          onChange={setConfirmacao}
          senha
        />
        {erro ? <Erro>{erro}</Erro> : null}
        <Botao
          rotulo={ocupado ? "Recuperando…" : "Recuperar"}
          desativado={ocupado || !codigo}
          onPress={() => {
            const problema = validarSenhaNova(nova, confirmacao);
            if (problema) {
              setErro(problema);
              return;
            }
            rodar(() => protecao.recuperar(codigo, nova), "codigo");
          }}
        />
        <Link rotulo="Voltar pra senha" onPress={() => setModo("senha")} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <Cartao titulo="Destrave neste aparelho">
        Digite sua senha de proteção. Ela é pedida uma vez em cada aparelho.
      </Cartao>
      <Campo
        rotulo="Senha de proteção"
        valor={senha}
        onChange={setSenha}
        senha
      />
      {erro ? <Erro>{erro}</Erro> : null}
      <Botao
        rotulo={ocupado ? "Destravando…" : "Destravar"}
        desativado={ocupado || !senha}
        onPress={() => rodar(() => protecao.destravar(senha), "senha")}
      />
      <Link rotulo="Esqueci a senha" onPress={() => setModo("codigo")} />
    </View>
  );
}

/** @param {{ protecao: ReturnType<typeof useProtection> }} props */
function Destravado({ protecao }) {
  const [trocando, setTrocando] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [feito, setFeito] = useState(false);

  async function handleTrocar() {
    const problema = validarSenhaNova(nova, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    setOcupado(true);
    try {
      await protecao.trocarSenha(atual, nova);
      setTrocando(false);
      setAtual("");
      setNova("");
      setConfirmacao("");
      setFeito(true);
    } catch (e) {
      console.error("[protecao] trocar senha falhou:", e);
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View className="gap-4">
      <Cartao titulo="Protegido neste aparelho">
        {feito
          ? "Senha trocada. O código de recuperação continua o mesmo."
          : "Seus registros sensíveis são cifrados aqui antes de sair do aparelho."}
      </Cartao>
      {trocando ? (
        <>
          <Campo rotulo="Senha atual" valor={atual} onChange={setAtual} senha />
          <Campo rotulo="Senha nova" valor={nova} onChange={setNova} senha />
          <Campo
            rotulo="Repita a senha nova"
            valor={confirmacao}
            onChange={setConfirmacao}
            senha
          />
          {erro ? <Erro>{erro}</Erro> : null}
          <Botao
            rotulo={ocupado ? "Trocando…" : "Trocar senha"}
            desativado={ocupado || !atual}
            onPress={handleTrocar}
          />
          <Link rotulo="Cancelar" onPress={() => setTrocando(false)} />
        </>
      ) : (
        <>
          <Botao
            rotulo="Trocar senha"
            secundario
            onPress={() => {
              setFeito(false);
              setTrocando(true);
            }}
          />
          <Link
            rotulo="Travar este aparelho"
            onPress={() =>
              confirmAction({
                title: "Travar este aparelho",
                message:
                  "Os registros protegidos ficam ilegíveis aqui até você digitar a senha de novo. Nada é apagado.",
                confirmLabel: "Travar",
                onConfirm: () => protecao.travar(),
              })
            }
          />
        </>
      )}
    </View>
  );
}

// --- peças de interface --------------------------------------------------------

function Voltar({ t }) {
  return (
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

function Cartao({ titulo, children }) {
  return (
    <View className="gap-2 rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark p-5">
      <Text
        className="text-lg text-ink dark:text-ink-dark"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {titulo}
      </Text>
      <Texto>{children}</Texto>
    </View>
  );
}

function Campo({ rotulo, valor, onChange, senha, mono }) {
  const t = useThemeTokens();
  return (
    <View>
      <Text
        className="mb-3 text-xs uppercase tracking-wider text-label dark:text-label-dark"
        style={{ fontFamily: "JetBrainsMono_500Medium" }}
      >
        {rotulo}
      </Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        secureTextEntry={Boolean(senha)}
        autoCapitalize={mono ? "characters" : "none"}
        autoCorrect={false}
        autoComplete={senha ? "new-password" : "off"}
        accessibilityLabel={rotulo}
        className="rounded-2xl border border-border-subtle dark:border-border-subtle-dark bg-white dark:bg-card-dark px-4"
        style={{
          fontFamily: mono ? "JetBrainsMono_500Medium" : "Inter_400Regular",
          fontSize: 15,
          color: t.ink,
          paddingVertical: 14,
        }}
      />
    </View>
  );
}

function Erro({ children }) {
  return (
    <Text
      className="text-sm text-danger"
      style={{ fontFamily: "Inter_400Regular" }}
    >
      {children}
    </Text>
  );
}

function Botao({ rotulo, onPress, desativado, secundario }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: Boolean(desativado) }}
      disabled={desativado}
      onPress={onPress}
      className={`items-center rounded-2xl py-4 ${
        secundario
          ? "border border-border-strong dark:border-border-strong-dark bg-white dark:bg-card-dark active:opacity-70"
          : desativado
            ? "bg-border-strong dark:bg-border-strong-dark"
            : "bg-primary dark:bg-primary-dark active:opacity-70"
      }`}
    >
      <Text
        className={`text-base ${secundario ? "text-primary dark:text-primary-dark" : "text-white dark:text-on-primary-dark"}`}
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}

function Link({ rotulo, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      className="items-center py-2 active:opacity-70"
    >
      <Text
        className="text-sm text-primary dark:text-primary-dark"
        style={{ fontFamily: "Inter_500Medium" }}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
