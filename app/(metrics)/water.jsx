// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useLocalSearchParams, usePathname } from "expo-router";

import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyHistory from "@/components/MyHistory";
import MyButton from "@/components/MyButton";
import MyView from "@/components/MyView";
import Score from "@/components/Score";

import { getCategoryInfo } from "@/components/categoryUtils";
import getDate from "@/constants/getDate";

import { add, getById, update } from "@/infra/database";
//#endregion

export default function Water() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, unit } = getCategoryInfo(pathname) ?? {};
  const { id } = useLocalSearchParams();

  //#region states
  const [date] = useState(getDate());
  const [ideal, setIdeal] = useState();
  const [score, setScore] = useState();
  const [min, setMin] = useState();
  const [max, setMax] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [quantity, setQuantity] = useState();
  const [visible, setVisible] = useState(false);
  //#endregion

  //#region edição
  useEffect(() => {
    if (!id) return;
    const r = getById(id);
    if (!r) return;
    setQuantity(String(r.quantity ?? ""));
    setObservation(r.note ?? r.observation ?? "");
    setMin(r.min ?? "");
    setMax(r.max ?? "");
    setIdeal(r.ideal ?? "");
    setScore(r.score);
  }, [id]);
  //#endregion

  //#region functions
  function handleSubmit() {
    setVisible(true);
    const data = {
      date: date.ISOdate,
      quantity: Number(quantity) || 0,
      unit,
      note: observation,
      min,
      max,
      ideal,
      score,
    };
    if (id) update(id, data);
    else add("water", data);
    setReloadKey((prev) => prev + 1);
  }
  function onDismissSnackBar() {
    setVisible(false);
  }
  //#endregion

  return (
    <MyView
      safe={true}
      className="flex-1 items-center gap-4 bg-light-background p-4 dark:bg-dark-background"
    >
      <Snackbar
        visible={visible}
        onDismiss={onDismissSnackBar}
        action={{
          label: "Fechar",
          onPress: onDismissSnackBar,
        }}
      >
        Registro salvo!
      </Snackbar>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{
          alignItems: "center",
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <MyView
          safe={false}
          className="max-w-[640px] gap-8 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
        >
          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            {date.displayDate} {displayName}
          </Text>

          {/* card Wrapper */}
          <MyView safe={false} className="flex-row justify-between">
            <MyView safe={false} className="gap-2.5">
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                MIN
              </Text>
              <TextInput
                className="max-w-[160px] rounded-lg bg-light-backgroundCard p-1.5 text-[26px] font-bold text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
                placeholder="--"
                value={min}
                onChangeText={(value) => setMin(value)}
              />
            </MyView>
            <MyView safe={false} className="gap-2.5">
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                MAX
              </Text>
              <TextInput
                className="max-w-[160px] rounded-lg bg-light-backgroundCard p-1.5 text-[26px] font-bold text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
                placeholder="--"
                value={max}
                onChangeText={(value) => setMax(value)}
              />
            </MyView>
            <MyView safe={false} className="gap-2.5">
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                IDEAL
              </Text>
              <TextInput
                className="max-w-[160px] rounded-lg bg-light-backgroundCard p-1.5 text-[26px] font-bold text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
                placeholder="--"
                value={ideal}
                onChangeText={(value) => setIdeal(value)}
              />
            </MyView>
          </MyView>

          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            Nota
          </Text>
          <Score value={score} onPress={setScore} />
          {/* OBS */}
          <MyView safe={false} className="gap-1">
            <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
              OBS:
            </Text>
            <TextInput
              value={observation}
              onChangeText={(value) => setObservation(value)}
              className="h-16 rounded-lg bg-light-backgroundCard p-1.5 text-[19px] font-normal text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
              placeholder="Observações sobre água..."
            />
          </MyView>

          <MyView
            safe={false}
            className="flex-row flex-wrap items-center gap-4"
          >
            <MyView
              safe={false}
              className="w-1/2 grow flex-row items-center justify-center gap-8 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
            >
              <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
                {displayName} hoje
              </Text>
              <TextInput
                className="h-[51px] w-20 rounded-lg bg-dark-background p-1.5 text-center text-[26px] font-bold text-white"
                placeholder="--"
                value={quantity}
                onChangeText={(value) => setQuantity(value)}
              />
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                ml
              </Text>
            </MyView>
            <MyButton title="Salvar" onPress={() => handleSubmit()} />
          </MyView>
        </MyView>
        <MyHistory tableName={pathname} reload={reloadKey} />
      </ScrollView>
    </MyView>
  );
}
