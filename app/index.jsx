// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports

import { Text } from "react-native";
import { Card } from "react-native-paper";

import MyView from "@/components/MyView";

import { shadow } from "@/constants/Colors";
import MyHeader from "@/components/MyHeader";
//#endregion

export default function Home() {
  return (
    <MyView className="flex-1 items-center bg-light-background dark:bg-dark-background">
      <MyHeader />
      <Card mode="contained" style={[{ width: "50%", height: "50%" }, shadow]}>
        <Card.Title
          title="Olá, mundo!"
          subtitle="Esse pedaço de tecnologia está em construção!"
        />
        <Card.Content>
          <Text variant="headlineMedium">
            Essa versão beta conta com as seguintes funcionalidades
          </Text>
          <MyView className="flex-row items-center">
            <Text className="text-light-text dark:text-dark-text">
              * Registro diário de ingestão de água
            </Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text className="text-light-text dark:text-dark-text">
              * Registro diário de sono
            </Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text className="text-light-text dark:text-dark-text">
              * Registro diário de exercício
            </Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text className="text-light-text dark:text-dark-text">
              * Registro diário de refeições
            </Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Text className="text-light-text dark:text-dark-text">
              * Registro diário de estudo
            </Text>
          </MyView>
        </Card.Content>
      </Card>
    </MyView>
  );
}
