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

import MyView from "@/components/MyView";
import MyButtonRaw from "@/components/MyButton";
import { shadow } from "@/constants/Colors";
import { EAS_INSTALL_URL } from "@/constants/distribution";

// MyButton é legado (@ts-nocheck, ADR-002): sua assinatura inferida marca as
// props como obrigatórias, o que quebra consumidores tipados. Tratamos como
// any até ele ser tipado de fato.
const MyButton = /** @type {any} */ (MyButtonRaw);

const CARD =
  "w-full max-w-[640px] rounded-lg bg-light-backgroundCard p-4 dark:bg-dark-backgroundCard";
const LABEL =
  "font-bold text-xs text-light-text opacity-60 dark:text-dark-text";
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
    <MyView
      safe={false}
      className={`${CARD} items-center gap-3`}
      style={shadow}
    >
      <Text className={`${LABEL} self-start`}>OBTER O APP</Text>
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
    </MyView>
  );
}
