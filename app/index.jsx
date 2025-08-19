import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import Header from "@/components/MyHeader";
import MyView from "@/components/MyView";
import MyCard from "@/components/MyCard";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <>
      <MyView
        className="flex-1 gap-5 p-10"
        style={{ backgroundColor: theme.background }}
      >
        <Header />
        <MyCard title="água" />
      </MyView>
    </>
  );
}
