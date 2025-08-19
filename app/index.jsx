import { View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import Header from "@/components/Header";
import MyView from "@/components/MyView";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <MyView
        className="flex-1 items-center gap-5 p-10"
        style={{ backgroundColor: theme.background }}
      >
        <Header />
      </MyView>
    </>
  );
}
