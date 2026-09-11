// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Testes das funções de domínio da store (M4, #134). Puros, sem React.
// A store é um singleton de módulo; zeramos entre os testes.
import {
  update,
  getById,
  toggleRetomadaDemo,
  store,
  add,
  remove,
  getToday,
  getByDate,
  getAll,
  addTester,
  getTesters,
  removeTester,
} from "../infra/database";

beforeEach(() => {
  store.delTables();
});

describe("registros", () => {
  const hoje = () => new Date().toISOString();

  test("add grava e getToday agrupa por tipo", () => {
    add("water", { date: hoje(), quantity: 500, unit: "ml" });
    add("water", { date: hoje(), quantity: 300, unit: "ml" });
    add("sleep", { date: hoje(), quantity: 480, unit: "min" });

    const today = getToday();
    expect(today.water).toHaveLength(2);
    expect(today.sleep).toHaveLength(1);
    // Mais recente primeiro (#314): o 300 entrou depois do 500, então vem
    // antes. Este teste afirmava o contrário, porque a ordem era a de
    // inserção da tabela e ninguém tinha decidido nada sobre ela.
    expect(today.water.map((r) => r.quantity)).toEqual([300, 500]);
  });

  test("getByDate isola o dia (não mistura com hoje)", () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    add("water", { date: ontem.toISOString(), quantity: 200, unit: "ml" });

    expect(getByDate(ontem.toISOString()).water).toHaveLength(1);
    // Hoje não deve enxergar o registro de ontem.
    expect(getToday().water).toBeUndefined();
  });

  test("remove tira o registro", () => {
    add("feeding", { date: hoje(), quantity: 1, unit: "refeição" });
    const id = getAll("feeding")[0].id;

    remove(id);

    expect(getAll("feeding")).toHaveLength(0);
  });

  test("details específicos do tipo sobrevivem via hidratar", () => {
    add("exercise", {
      date: hoje(),
      quantity: 60,
      unit: "min",
      training: true,
      cardio: false,
    });
    const row = getAll("exercise")[0];
    expect(row.training).toBe(true);
    expect(row.cardio).toBe(false);
  });
});

describe("testers", () => {
  test("addTester normaliza o número e getTesters devolve", () => {
    addTester({ name: "Fulano", phone: "+55 (11) 99999-9999" });

    const t = getTesters();
    expect(t).toHaveLength(1);
    expect(t[0].name).toBe("Fulano");
    expect(t[0].phone).toBe("+5511999999999");
  });

  test("removeTester tira da lista", () => {
    addTester({ name: "A", phone: "+5511111111111" });
    addTester({ name: "B", phone: "+5522222222222" });
    const id = getTesters()[0].id;

    removeTester(id);

    const restantes = getTesters();
    expect(restantes).toHaveLength(1);
    expect(restantes[0].name).toBe("B");
  });
});

describe("previsualização da retomada (#320)", () => {
  test("toggleRetomadaDemo alterna e devolve o estado novo", () => {
    // A tela de retomada exige 3+ dias sem registro, condição que quem usa o
    // app diariamente não produz sem apagar os próprios dados. Sem este
    // interruptor a mudança da #320 seria mergeada sem ninguém ter visto.
    expect(toggleRetomadaDemo()).toBe(true);
    expect(toggleRetomadaDemo()).toBe(false);
  });
});

describe("sono guarda os horários (#328)", () => {
  test("bed e wake sobrevivem ao round-trip pelo details", () => {
    // Antes da #328 o add descartava os dois, e a edição não tinha o que
    // mostrar. Este teste é o que garante que eles voltam pelo getById.
    add("sleep", {
      date: new Date().toISOString(),
      unit: "min",
      quantity: 440,
      score: 4,
      bed: "23:40",
      wake: "07:00",
    });
    const r = getAll("sleep")[0];
    expect(r.bed).toBe("23:40");
    expect(r.wake).toBe("07:00");
    expect(r.quantity).toBe(440);
    expect(getById(r.id).wake).toBe("07:00");
  });

  test("editar horário não apaga os campos legados do registro", () => {
    add("sleep", {
      date: new Date().toISOString(),
      unit: "min",
      quantity: 440,
      score: 4,
      bed: "23:40",
      wake: "07:00",
    });
    const id = getAll("sleep")[0].id;
    update(id, {
      unit: "min",
      quantity: 420,
      note: "acordei antes",
      score: 4,
      bed: "23:40",
      wake: "06:40",
    });
    const r = getById(id);
    expect(r.quantity).toBe(420);
    expect(r.wake).toBe("06:40");
    expect(r.note).toBe("acordei antes");
  });
});
