//#region imports

import { Text } from "react-native";
import { Dot } from "lucide-react-native";
import { Card } from "react-native-paper";

import MyView from "@/components/MyView";

import { useThemedStyles } from "@/hook/useThemedStyle";

import { Colors } from "@/constants/Colors";
//#endregion

export default function Home() {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    card: {
      width: "50%",
      height: "50%",
      boxShadow: Colors.shadow,
    },
    button: {
      backgroundColor: theme.background,
    },
  }));
  return (
    <MyView style={styles.container} safe={true}>
      <Card mode="contained" style={styles.card}>
        <Card.Title
          title="Olá, mundo!"
          subtitle="Esse pedaço de tecnologia está em construção!"
        />
        <Card.Content>
          <Text variant="headlineMedium">
            Essa versão beta conta com as seguintes funcionalidades
          </Text>
          <MyView
            className="flex-row items-c
          enter"
          >
            <Dot />
            <Text>Registro diário de ingestão de água</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Dot />
            <Text>Registro diário de sono</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Dot />
            <Text>Registro diário de exercício</Text>
          </MyView>
          <MyView className="flex-row items-center">
            <Dot />
            <Text>Registro diário de refeições</Text>
          </MyView>
        </Card.Content>
      </Card>
    </MyView>
  );
}
