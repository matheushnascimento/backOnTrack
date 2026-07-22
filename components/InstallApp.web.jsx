// Card "Obter o app" — versão web (Ciclo 3, #74; distribuição via EAS #90).
//
// Só existe no bundle web (o Metro resolve este .web.jsx na web e o
// InstallApp.jsx no nativo). Detecta o navegador:
//  - desktop  -> QR code da página de instalação do EAS, pra escanear com o
//               celular;
//  - celular  -> botão que abre a página de instalação do EAS.
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

function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function InstallApp() {
  // Detecta após a montagem (client-side) pra não divergir do render estático;
  // o desktop (QR) é o default seguro enquanto não há navigator.
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(isMobileBrowser()), []);

  return (
    <Card className="items-center gap-3">
      <SectionLabel className="self-start">OBTER O APP</SectionLabel>
      {mobile ? (
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
            Aponte a câmera do celular pra abrir a instalação no Android.
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
