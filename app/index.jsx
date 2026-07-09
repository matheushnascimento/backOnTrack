// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports

import { Text } from "react-native";
import { Card } from "react-native-paper";

import MyView from "@/components/MyView";

import { useThemedStyles } from "@/hook/useThemedStyle";

import { shadow } from "@/constants/Colors";
import MyHeader from "@/components/MyHeader";
//#endregion

export default function Home() {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      alignItems: "center",
      backgroundColor: theme.background,
    },
    card: {
      width: "50%",
      height: "50%",
    },
    button: {
      backgroundColor: theme.background,
    },
  }));
  return (
    <MyView style={styles.container}>
      <MyHeader />
      <Card mode="contained" style={[styles.card, shadow]}>
        <Card.Title
          title="Olá, mundo!"
          subtitle="Esse pedaço de tecnologia está em construção!"
        />
        <Card.Content>
          <Text variant="headlineMedium">
            Essa versão beta conta com as seguintes funcionalidades
          </Text>
          <MyView className="flex-row items-center">
            <Text>* Registro diário de ingestão de água</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text>* Registro diário de sono</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text>* Registro diário de exercício</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text>* Registro diário de refeições</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text>* Registro diário de estudo</Text>
          </MyView>
        </Card.Content>
      </Card>
    </MyView>
  );
}
