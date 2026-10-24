// WebCrypto e gerador aleatório seguro no app (#388, fatia 2 da #374).
//
// O React Native não tem `crypto.getRandomValues` nem `crypto.subtle`. O núcleo
// de criptografia ponta a ponta (`constants/e2e.js`) precisa dos dois, e falha
// alto sem eles. O `install()` do react-native-quick-crypto põe a versão nativa
// no `globalThis.crypto`, com PBKDF2 e HKDF pelo `subtle`.
//
// ⚠️ Importar ANTES de qualquer coisa que use criptografia, no topo do
// `app/_layout.jsx`. No navegador quem entra é o `cryptoSetup.web.js`, vazio: o
// `install()` SUBSTITUI o `crypto` global, e o do navegador já é nativo.
import { install } from "react-native-quick-crypto";

install();
