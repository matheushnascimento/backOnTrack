import { useEffect, useState } from "react";

import Button from "./MyButton";
import MyView from "./MyView";
import { getCategoryInfo, CATEGORY_MAP } from "./categoryUtils";
import { router, usePathname } from "expo-router";
import { useColorScheme } from "react-native";
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
    <MyView
      className="self-start items-start gap-5"
      style={{
        width: "100%",
        flexDirection: "row",
        padding: 12,
        backgroundColor: theme.background,
      }}
    >
      {Object.entries(CATEGORY_MAP).map(([index, category]) => (
        <Button
          key={index}
          title={category.displayName}
          isSelected={selectedButton === index}
          onPress={() => handleButtonSelection(index)}
        ></Button>
      ))}
    </MyView>
  );
}
