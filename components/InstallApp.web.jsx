// Card "Obter o app": versão web (Ciclo 3, #74; distribuição via EAS #90).
//
// Só existe no bundle web (o Metro resolve este .web.jsx na web e o
// InstallApp.jsx no nativo). Detecta o navegador:
//  - desktop  -> QR code da página de instalação do EAS, pra escanear com o
//               celular;
//  - Android  -> botão que abre a página de instalação do EAS;
//  - iPhone   -> como adicionar à tela de início, que é o app no iPhone
//               (PWA, #408). Não há APK pra iOS.
// Aberto pelo ícone da tela de início, o card some: o app já está instalado.
// Aponta pro EAS (não pro APK direto do GitHub) porque o Chrome do Android
// bloqueia download de APK de URL pública; a página do EAS instala no Chrome.
// O QR é gerado offline (react-native-qrcode-svg sobre react-native-svg), sem
// nenhuma chamada a serviço externo.

import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import MyButtonRaw from "@/components/MyButton";
import CardRaw from "@/components/Card";
import SectionLabelRaw from "@/components/SectionLabel";
import { EAS_INSTALL_URL } from "@/constants/distribution";

// MyButton é legado (@ts-nocheck, ADR-002): sua assinatura inferida marca as
// props como obrigatórias, o que quebra consumidores tipados. Tratamos como
// any até ele ser tipado de fato.
const MyButton = /** @type {any} */ (MyButtonRaw);
const Card = /** @type {any} */ (CardRaw);
const SectionLabel = /** @type {any} */ (SectionLabelRaw);

const TEXT = "text-center text-base text-light-text dark:text-dark-text";

/** @returns {"instalado"|"ios"|"android"|"desktop"} */
function detectarAparelho() {
  if (typeof navigator === "undefined") return "desktop";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    /** @type {any} */ (navigator).standalone === true;
  if (standalone) return "instalado";
  const ua = navigator.userAgent;
  // iPad com iPadOS se apresenta como Mac; o toque é o que denuncia.
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || ipad) return "ios";
  if (/Android|Mobile/i.test(ua)) return "android";
  return "desktop";
}

export default function InstallApp() {
  // Detecta após a montagem (client-side) pra não divergir do render estático;
  // o desktop (QR) é o default seguro enquanto não há navigator.
  const [aparelho, setAparelho] = useState("desktop");
  useEffect(() => setAparelho(detectarAparelho()), []);

  if (aparelho === "instalado") return null;

  return (
    <Card className="items-center gap-3">
      <SectionLabel className="self-start">OBTER O APP</SectionLabel>
      {aparelho === "ios" ? (
        <Text className={TEXT}>
          No iPhone, o app se instala pelo navegador: toque em Compartilhar e
          depois em &quot;Adicionar à Tela de Início&quot;. Ele passa a abrir
          pelo ícone, em tela cheia e sem rede.
        </Text>
      ) : aparelho === "android" ? (
        <>
          <Text className={TEXT}>
            Abra a página de instalação e toque em Install.
          </Text>
          <MyButton
            title="Instalar o app"
            onPress={() => Linking.openURL(EAS_INSTALL_URL)}
          />
        </>
      ) : (
        <>
          <Text className={TEXT}>
            Aponte a câmera do celular pra abrir a instalação no Android. No
            iPhone, abra este endereço no navegador e adicione à tela de início.
          </Text>
          <View className="rounded-lg bg-white p-3">
            <QRCode
              value={EAS_INSTALL_URL}
              size={180}
              backgroundColor="#ffffff"
              color="#000000"
            />
          </View>
        </>
      )}
    </Card>
  );
}
