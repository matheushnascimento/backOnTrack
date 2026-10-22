// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Preferências do aparelho fora do store sincronizado.
//
// Com stores reais do TinyBase, porque o que importa aqui é o comportamento
// dele: um `delValue` que não apaga deixaria a preferência viajando do mesmo
// jeito, e nenhum mock pegaria isso.

import { createMergeableStore, createStore } from "tinybase";

import {
  LOCAL_PREFS_SCHEMA,
  LOCAL_PREF_KEYS,
  migrateLocalPrefs,
} from "@/constants/localPrefs";

/** Store principal como o app monta: as chaves legadas SEM default. */
function sincronizado() {
  const schema = {};
  for (const k of LOCAL_PREF_KEYS) {
    schema[k] = { type: LOCAL_PREFS_SCHEMA[k].type };
  }
  return createMergeableStore().setValuesSchema({
    displayName: { type: "string", default: "" },
    ...schema,
  });
}

const local = () => createStore().setValuesSchema(LOCAL_PREFS_SCHEMA);

describe("migrateLocalPrefs", () => {
  it("traz o que o aparelho tinha e apaga do sincronizado", () => {
    const s = sincronizado();
    const l = local();
    s.setValue("reminderEnabled", true);
    s.setValue("reminderTime", "22:15");

    const copiadas = migrateLocalPrefs(s, l);

    expect(copiadas.sort()).toEqual(["reminderEnabled", "reminderTime"]);
    expect(l.getValue("reminderEnabled")).toBe(true);
    expect(l.getValue("reminderTime")).toBe("22:15");
    for (const k of LOCAL_PREF_KEYS) expect(s.hasValue(k)).toBe(false);
  });

  it("o que nunca foi ligado fica no padrão do local", () => {
    const s = sincronizado();
    const l = local();
    expect(migrateLocalPrefs(s, l)).toEqual([]);
    expect(l.getValue("reminderEnabled")).toBe(false);
    expect(l.getValue("journeyDemoLevel")).toBe(-1);
  });

  it("não mexe no que é da conta", () => {
    const s = sincronizado();
    s.setValue("displayName", "Matheus");
    migrateLocalPrefs(s, local());
    expect(s.getValue("displayName")).toBe("Matheus");
  });

  it("roda uma vez só por aparelho", () => {
    const s = sincronizado();
    const l = local();
    migrateLocalPrefs(s, l);
    l.setValue("reminderEnabled", true);

    expect(migrateLocalPrefs(s, l)).toEqual([]);
    expect(l.getValue("reminderEnabled")).toBe(true);
  });

  it("valor que chega depois pelo sync não sobrescreve a escolha local", () => {
    // Um aparelho ainda na versão antiga pode escrever no sincronizado. A
    // escolha deste aparelho é a que vale aqui.
    const s = sincronizado();
    const l = local();
    migrateLocalPrefs(s, l);
    s.setValue("reminderEnabled", true);

    migrateLocalPrefs(s, l);
    expect(l.getValue("reminderEnabled")).toBe(false);
  });

  it("a remoção vira dado que sincroniza", () => {
    // É ela que desliga a preferência nos outros aparelhos: sem a remoção no
    // conteúdo mesclável, o valor antigo continuaria na sala da conta.
    const s = sincronizado();
    s.setValue("retomadaDemo", true);
    migrateLocalPrefs(s, local());

    const [, [valores]] = s.getMergeableContent();
    expect(valores.retomadaDemo).toBeDefined();
    expect(s.hasValue("retomadaDemo")).toBe(false);
  });
});

describe("por que o schema sincronizado perdeu o default dessas chaves", () => {
  it("com default, delValue não apaga: volta ao padrão e continua lá", () => {
    // Se o store principal mantivesse `default: false`, a migração "apagaria"
    // e o valor seguiria existindo e viajando pela sala da conta.
    const comDefault = createMergeableStore().setValuesSchema({
      reminderEnabled: { type: "boolean", default: false },
    });
    comDefault.setValue("reminderEnabled", true);
    comDefault.delValue("reminderEnabled");
    expect(comDefault.hasValue("reminderEnabled")).toBe(true);
  });
});
