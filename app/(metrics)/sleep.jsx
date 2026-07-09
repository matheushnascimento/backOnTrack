// @ts-nocheck -- legado grandfatherizado por ADR-002 (#48); remover ao tipar este arquivo
//#region imports
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Snackbar } from "react-native-paper";

import MyView from "@/components/MyView";
import Score from "@/components/Score";
import MyButton from "@/components/MyButton";

import { add, getById, update } from "@/infra/database";
import MyHistory from "@/components/MyHistory";
import getDate from "@/constants/getDate";
import { hhmmToMinutes, minutesToHHMM } from "@/constants/duration";
import { useLocalSearchParams, usePathname } from "expo-router";
import { getCategoryInfo } from "@/components/categoryUtils";
//#endregion

export default function Sleep() {
  //#region variables
  const pathname = usePathname().substring(1);
  const { displayName, unit } = getCategoryInfo(pathname) ?? {};
  const { id } = useLocalSearchParams();

  //#region states
  const [date] = useState(getDate());
  const [ideal, setIdeal] = useState(8);
  const [score, setScore] = useState();
  const [min, setMin] = useState(7);
  const [max, setMax] = useState();
  const [observation, setObservation] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [sleepHours, setSleepHours] = useState();
  const [sleepMinutes, setSleepMinutes] = useState();
  const [visible, setVisible] = useState(false);
  //#endregion

  //#region edição
  useEffect(() => {
    if (!id) return;
    const r = getById(id);
    if (!r) return;
    const [h, m] = minutesToHHMM(r.quantity).split(":");
    setSleepHours(h);
    setSleepMinutes(m);
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
      quantity: hhmmToMinutes(`${sleepHours ?? 0}:${sleepMinutes ?? 0}`),
      unit,
      note: observation,
      min,
      max,
      ideal,
      score,
    };
    if (id) update(id, data);
    else add("sleep", data);
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
              />
            </MyView>
          </MyView>

          <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
            Nota
          </Text>
          <Score value={score} onPress={setScore} />

          <MyView safe={false} className="gap-1">
            <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
              OBS:
            </Text>
            <TextInput
              value={observation}
              onChangeText={(value) => setObservation(value)}
              className="h-16 rounded-lg bg-light-backgroundCard p-1.5 text-[19px] font-normal text-light-text dark:bg-dark-backgroundCard dark:text-dark-text"
              placeholder="Observações sobre sono..."
            />
          </MyView>

          <MyView
            safe={false}
            className="flex-row flex-wrap items-center justify-center gap-4"
          >
            <MyView
              safe={false}
              className="w-full grow flex-row items-center justify-center gap-4 rounded-lg bg-light-backgroundCard p-2.5 dark:bg-dark-backgroundCard"
            >
              <Text className="font-bold text-2xl text-light-text dark:text-dark-text">
                {displayName} hoje
              </Text>
              <TextInput
                className="h-[37px] max-w-[38px] rounded-md bg-dark-background px-1 text-center text-xl font-normal text-white"
                placeholder="--"
                value={sleepHours}
                onChangeText={(value) => setSleepHours(value)}
              />
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                h
              </Text>
              <TextInput
                className="h-[37px] max-w-[38px] rounded-md bg-dark-background px-1 text-center text-xl font-normal text-white"
                placeholder="--"
                value={sleepMinutes}
                onChangeText={(value) => setSleepMinutes(value)}
              />
              <Text className="flex-row gap-1.5 font-bold text-lg text-light-text dark:text-dark-text">
                min
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
