import { useState } from "react";
import { MetricsCategories } from "@/constants/MetricsCategories";

import Button from "./MyButton";
import MyView from "./MyView";

export default function MyHeader() {
  const [selectedButton, setSelectedButton] = useState(MetricsCategories[0]);

  return (
    <MyView
      className="items-start gap-5"
      style={{ flexDirection: "row", padding: 12 }}
    >
      {MetricsCategories &&
        MetricsCategories.map((category, index) => (
          <Button
            key={index}
            title={category}
            isSelected={selectedButton === category}
            onPress={() => setSelectedButton(category)}
          />
        ))}
    </MyView>
  );
}
