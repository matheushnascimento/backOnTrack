import { Text, useColorScheme } from "react-native";
import { Card, Icon } from "react-native-paper";
import { Colors } from "@/constants/Colors";
import MyInput from "./MyInput";
import MyView from "./MyView";
import { useState } from "react";

export default function MyCard({ title }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const date = new Date();

  const [min, setMin] = useState();
  const [max, setMax] = useState();
  const [ideal, setIdeal] = useState();

  return (
    <Card
      style={{
        backgroundColor: theme.backgroundCard,
      }}
    >
      <Card.Content className="flex justify-center items-center">
        <MyView safe="true" className="self-start flex-row gap-2">
          <Text>
            <Icon
              source="moon-waning-crescent"
              color={Colors.primary}
              size={20}
            />
          </Text>
          <Text style={{ color: "white" }}>
            {date.getDay()}/{date.getMonth()}/{date.getFullYear()}
          </Text>
          <Text style={{ color: "white" }}>{title}</Text>
        </MyView>
        <MyView className="w-full flex flex-row justify-between">
          <MyInput label="MIN" value={min} onTextChange={() => setMin(min)} />
          <MyInput label="MAX" value={max} onTextChange={() => setMax(max)} />
          <MyInput
            label="IDEAL"
            value={ideal}
            onTextChange={() => setIdeal(ideal)}
          />
        </MyView>
      </Card.Content>
    </Card>
  );
}
