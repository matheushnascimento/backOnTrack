import { Image, View, useColorScheme } from "react-native";
import { Colors } from "../constants/Colors";
import image from "../assets/trecho-em-obras.png";

export default function Home() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  return (
    <>
      <View
        className="flex-1 items-center"
        style={{ backgroundColor: theme.background }}
      >
        <Image source={image} />
      </View>
    </>
  );
}
