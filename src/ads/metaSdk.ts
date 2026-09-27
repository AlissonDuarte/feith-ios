/**
 * SDK da Meta, para medir as instalacoes que vem dos anuncios no Facebook e
 * no Instagram.
 *
 * Sem ele a campanha de promocao de app roda, mas a Meta nao fica sabendo quem
 * instalou: nao aprende para quem entregar e nao da para comparar criativos.
 * Com ele, o "instalou/abriu" chega sozinho (autoLogAppEventsEnabled no
 * app.config.ts) — nao ha evento manual a disparar.
 *
 * Por que a pergunta do ATT vem ANTES do initializeSDK: desde o SDK 17 do iOS
 * a propria Meta le o status do ATT na inicializacao, e o setAdvertiser-
 * TrackingEnabled antigo virou no-op. Iniciar primeiro e perguntar depois
 * faria a primeira abertura — justamente a instalacao — sair como "nao
 * autorizado" mesmo para quem toca em Permitir. Quem nega continua medido,
 * so que agregado (SKAdNetwork/AEM), e o app funciona igual.
 *
 * Sem app ID configurado o plugin nem entra no prebuild (ver app.config.ts) e
 * aqui nada roda: inicializar o SDK sem FacebookAppID no Info.plist derruba o
 * app com uma excecao nativa.
 *
 * O modulo e NATIVO: nao funciona no Expo Go. Use o development build.
 */
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';

const appId = process.env.EXPO_PUBLIC_META_APP_ID ?? '';

export const metaSdkAvailable = Boolean(appId);

let started = false;

/**
 * Pergunta o ATT (so aparece uma vez na vida do app; depois devolve a resposta
 * guardada) e inicia o SDK. Chamado uma vez na abertura, com o app ja ativo —
 * o iOS ignora o pedido de ATT feito com o app em background.
 */
export async function startMetaSdk(): Promise<void> {
  if (!metaSdkAvailable || started) return;
  started = true;

  try {
    await requestTrackingPermissionsAsync();
  } catch {
    // Sem resposta do ATT o SDK assume "nao autorizado", que e o caso seguro.
  }

  try {
    Settings.initializeSDK();
  } catch {
    // Medicao de anuncio nunca pode derrubar a abertura do app.
  }
}
