// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//
// Aviso de atualização OTA pendente (#131).
//
// O expo-updates baixa o update em background mas só o aplica na abertura
// SEGUINTE — e faz isso em silêncio. Na prática o tester roda um bundle velho
// sem saber: testa um bug já corrigido, bate nele e reporta "continua quebrado".
// Este banner torna esse estado visível e deixa aplicar na hora.
//
// Não recarrega sozinho de propósito: seria brusco no meio de um registro.
//
// Posicionado absoluto no rodapé porque cada tela já monta o próprio safe-area
// (MyView safe) e o app é edge-to-edge: em fluxo, no topo, ele brigaria com o
// inset das telas (gap duplo) ou ficaria sob a status bar. Absoluto flutua sobre
// a rota atual sem mexer no layout de ninguém.
//
// Em dev/web o expo-updates é no-op: `isUpdatePending` fica false e o banner
// nunca aparece.
import { Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdates, reloadAsync } from "expo-updates";

export default function UpdateBanner() {
  const { isUpdatePending } = useUpdates();
  const insets = useSafeAreaInsets();

  if (!isUpdatePending) return null;

  return (
    <Pressable
      onPress={() => reloadAsync()}
      android_ripple={{ color: "#00000022" }}
      className="absolute right-0 bottom-0 left-0 items-center bg-secondary px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Text className="text-center font-bold text-light-outerText dark:text-dark-text">
        Atualização pronta — toque para reiniciar
      </Text>
    </Pressable>
  );
}
