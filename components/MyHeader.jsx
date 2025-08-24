import { useEffect, useState } from "react";
import { MetricsCategories } from "@/constants/MetricsCategories";

import Button from "./MyButton";
import MyView from "./MyView";
import { router, usePathname } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export default function MyHeader() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const pathname = usePathname();
  const [selectedButton, setSelectedButton] = useState(
    MetricsCategories[pathname],
  );

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
    const matchedCategory = Object.values(MetricsCategories).find(
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
      {Object.entries(MetricsCategories).map(([index, category]) => (
        <Button
          key={index}
          title={category.displayName}
          isSelected={selectedButton === category.name}
          onPress={() => handleButtonSelection(category.name)}
        ></Button>
      ))}
    </MyView>
  );
}
