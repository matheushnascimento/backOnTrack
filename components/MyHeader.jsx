// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
import { useEffect, useState } from "react";

import Button from "./MyButton";
import { getCategoryInfo, CATEGORY_MAP } from "./categoryUtils";
import { router, usePathname } from "expo-router";
import { ScrollView } from "react-native";

export default function MyHeader() {
  const pathname = usePathname().substring(1);

  const { key } = getCategoryInfo(pathname);

  const [selectedButton, setSelectedButton] = useState(key);

  function handleButtonSelection(category) {
    if (category === selectedButton) {
      setSelectedButton(null);
      router.navigate("/");
    } else {
      router.navigate(`/(metrics)/${category}`);
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
      // Altura fixa evita o stretch visual durante a transição entre rotas:
      // sem `h-16`, o ScrollView herdava altura intrínseca dos filhos (chip +
      // shadow) e reflowava a cada re-render/navigate.
      // `shrink-0` impede que telas com muito conteúdo (Home) espremam o header
      // via flex-shrink default e invadam a área dos chips.
      className="h-16 shrink-0 grow-0 bg-light-background p-3 dark:bg-dark-background"
    >
      {Object.entries(CATEGORY_MAP).map(([index, category]) => (
        <Button
          // `h-10` trava a altura do chip: sem isso, o RN Web re-mede o
          // Pressable ao trocar bg-primary ↔ bg-secondary e o chip pisca de
          // tamanho a cada seleção. 40px casa com `text-base` + `py-2`.
          className="mx-4 h-10"
          key={index}
          title={category.displayName}
          isSelected={selectedButton === index}
          onPress={() => handleButtonSelection(index)}
        />
      ))}
    </ScrollView>
  );
}
export function MyMonthHeader({ onMonthSelect }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = new Array(12).fill(0).map((_, i) => {
    return new Date(`${i + 1}/1`).toLocaleDateString(undefined, {
      month: "long",
    });
  });

  function handleButtonSelection(index) {
    setSelectedMonth(index);
    onMonthSelect?.(index);
  }

  return (
    <ScrollView horizontal={true} className="w-full grow-0 bg-transparent p-3">
      {months.map((month, index) => (
        <Button
          className="mx-4"
          key={index}
          title={month.toUpperCase().substring(0, 3)}
          isSelected={selectedMonth === index}
          onPress={() => handleButtonSelection(index)}
        />
      ))}
    </ScrollView>
  );
}
