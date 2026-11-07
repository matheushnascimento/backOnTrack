// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
// Permissão do push no navegador (#417): liberar a notificação tem que
// avisar quem agenda. No celular, quem avisa é a volta ao primeiro plano; no
// navegador, liberar não tira a aba da frente, e os lembretes que já estavam
// ligados ficavam sem ir pro server.

import { observarPermissao, pedirPermissao } from "@/infra/webPush.web";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const original = {};

/** O que o navegador expõe, com a permissão em `estado.permission`. */
function navegador({ comPermissionsApi = true } = {}) {
  const estado = { permission: "default" };
  const status = new EventTarget();
  globalThis.Notification = {
    get permission() {
      return estado.permission;
    },
    requestPermission: jest.fn(async () => {
      estado.permission = "granted";
      return "granted";
    }),
  };
  globalThis.PushManager = function PushManager() {};
  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    value: {},
    configurable: true,
  });
  Object.defineProperty(globalThis.navigator, "permissions", {
    value: comPermissionsApi
      ? { query: jest.fn(async () => status) }
      : undefined,
    configurable: true,
  });
  return { estado, status };
}

beforeAll(() => {
  original.location = window.location;
  delete window.location;
  window.location = { protocol: "https:" };
});
afterAll(() => {
  window.location = original.location;
  delete globalThis.Notification;
  delete globalThis.PushManager;
});

const tique = () => new Promise((r) => setTimeout(r, 0));

describe("observarPermissao", () => {
  it("o pedido de Ajustes avisa quem observa", async () => {
    navegador();
    const ao = jest.fn();
    const parar = observarPermissao(ao);
    expect(await pedirPermissao()).toBe(true);
    expect(ao).toHaveBeenCalledTimes(1);
    parar();
  });

  it("mudar nas configurações do site também avisa", async () => {
    const { status } = navegador();
    const ao = jest.fn();
    const parar = observarPermissao(ao);
    await tique();
    status.dispatchEvent(new Event("change"));
    expect(ao).toHaveBeenCalledTimes(1);
    parar();
    status.dispatchEvent(new Event("change"));
    expect(ao).toHaveBeenCalledTimes(1);
  });

  it("sem a API de permissões, o pedido ainda avisa", async () => {
    const { estado } = navegador({ comPermissionsApi: false });
    const ao = jest.fn();
    const parar = observarPermissao(ao);
    await pedirPermissao();
    expect(ao).toHaveBeenCalledTimes(1);
    parar();
    // De volta a "perguntar", pra o segundo pedido chegar no navegador.
    estado.permission = "default";
    await pedirPermissao();
    expect(Notification.requestPermission).toHaveBeenCalledTimes(2);
    expect(ao).toHaveBeenCalledTimes(1);
  });
});
