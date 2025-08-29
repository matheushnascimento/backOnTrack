import { useEffect, useState } from "react";

import Button from "./MyButton";
import MyView from "./MyView";
import { getCategoryInfo, CATEGORY_MAP } from "./categoryUtils";
import { router, usePathname } from "expo-router";
import {
  FlatList,
  ScrollView,
  ScrollViewBase,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/Colors";

export default function MyHeader() {
  const colorScheme = useColorScheme();
  const pathname = usePathname().substring(1);

  const { key } = getCategoryInfo(pathname);

  const theme = Colors[colorScheme] ?? Colors.light;

  const [selectedButton, setSelectedButton] = useState(key);

  function handleButtonSelection(category) {
    if (category === selectedButton) {
      setSelectedButton(null);
      router.navigate("/");
    } else {
      router.navigate(`/${category}`);
      setSelectedButton(category);
    }
  }

  useEffect(() => {
    const matchedCategory = Object.values(CATEGORY_MAP).find(
      (category) => pathname === `/${category.name}`,
    );
    if (matchedCategory) {
      setSelectedButton(matchedCategory.name);
    }
  }, [pathname]);
  return (
    <ScrollView
      horizontal={true}
      style={{
        flexGrow: 0,
        padding: 12,
        gap: 20,
        backgroundColor: theme.background,
      }}
    >
      {Object.entries(CATEGORY_MAP).map(([index, category]) => (
        <Button
          style={{ marginHorizontal: "1rem" }}
          key={index}
          title={category.displayName}
          isSelected={selectedButton === index}
          onPress={() => handleButtonSelection(index)}
        ></Button>
      ))}
    </ScrollView>
  );
}
