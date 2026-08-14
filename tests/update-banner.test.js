// @ts-nocheck -- teste; globals do jest não são tipados (ADR-002)
import { pickBanner } from "@/constants/bannerPriority";

// A ordem dos banners é a decisão com risco de bug aqui (#281). O de login é
// o único permanente: enquanto a pessoa não entrar, ele fica. Se subisse na
// prioridade, esconderia por tempo indeterminado avisos que importam mais.

describe("pickBanner", () => {
  it("nenhum estado ativo = nenhum banner", () => {
    expect(pickBanner({})).toBeNull();
  });

  it("mostra o de login quando só falta entrar", () => {
    expect(pickBanner({ needsAuth: true })).toBe("needs-auth");
  });

  it("dispensado esconde o de login", () => {
    expect(pickBanner({ needsAuth: true, authDismissed: true })).toBeNull();
  });

  // O caso que importa: dispensar o login não pode engolir os outros.
  it("dispensar o login não afeta os banners de atualização", () => {
    expect(
      pickBanner({
        isUpdatePending: true,
        needsAuth: true,
        authDismissed: true,
      }),
    ).toBe("update-pending");
  });

  // --- prioridade -------------------------------------------------------

  // Sem reinstalar o APK o device nem recebe correção por OTA. É o aviso que
  // não pode ser escondido por nada.
  it("APK desatualizado ganha de todo o resto", () => {
    expect(
      pickBanner({
        nativeOutdated: true,
        isDownloading: true,
        isUpdatePending: true,
        needsAuth: true,
      }),
    ).toBe("native-outdated");
  });

  it("download em andamento ganha do pendente e do login", () => {
    expect(
      pickBanner({
        isDownloading: true,
        isUpdatePending: true,
        needsAuth: true,
      }),
    ).toBe("downloading");
  });

  it("atualização pronta ganha do login", () => {
    expect(pickBanner({ isUpdatePending: true, needsAuth: true })).toBe(
      "update-pending",
    );
  });

  // O login é o último da fila, sempre. Este é o teste que quebra se alguém
  // reordenar achando que "precisa entrar" é mais urgente.
  it("login é o de menor prioridade contra cada um dos outros", () => {
    for (const outro of [
      "nativeOutdated",
      "isDownloading",
      "isUpdatePending",
    ]) {
      expect(pickBanner({ [outro]: true, needsAuth: true })).not.toBe(
        "needs-auth",
      );
    }
  });
});
