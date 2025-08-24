import { Colors } from "@/constants/Colors";

import { StyleSheet, useColorScheme } from "react-native";

import { Dot } from "lucide-react-native";
import { Card, Text } from "react-native-paper";
import { List } from "react-native-paper";

import MyView from "@/components/MyView";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      backgroundColor: theme.background,
    },
    card: {
      width: "50%",
      height: "50%",
    },
  });
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
          <MyView className="flex-row items-center">
            <Dot />
            <List.Item title="Registro diário de ingestão de água" />
          </MyView>
        </Card.Content>
      </Card>
    </MyView>
  );
}
