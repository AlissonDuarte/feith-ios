import type { ExpoConfig } from 'expo/config';

/**
 * Config do app Expo.
 *
 * E .ts em vez de app.json por causa do ATS: em dev o app aponta para o
 * backend do docker-compose por HTTP simples num IP de LAN, e o App Transport
 * Security do iOS bloqueia cleartext por padrao. A excecao so e injetada
 * quando a URL configurada e de fato http://, entao um build de producao
 * (https://feith.space/api) sai sem nenhuma brecha.
 *
 * TODAS as capabilities entram aqui de uma vez, mesmo as que so serao usadas
 * la na frente (IAP, audio em background, associated domains). O motivo e o
 * provisioning profile: ele nasce com as capabilities que o App ID tinha
 * naquele momento, e adicionar uma depois obriga a habilitar no portal e
 * rodar ios-credentials.yml de novo com force. Declarar tudo no dia 1 custa
 * nada; descobrir na M5 custa um ciclo.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const isCleartextApi = apiUrl.startsWith('http://');

/**
 * Ambiente do APNs gravado no entitlement aps-environment.
 *
 * 'development' aponta o app para o APNs sandbox; 'production' para o real. Os
 * dois registram e devolvem um device token normalmente — o erro so aparece do
 * outro lado: um build de TestFlight assinado com 'development' recebe token,
 * manda pro backend e nunca entrega nada, sem log nenhum no aparelho dizendo
 * por que. Por isso o CI exporta APS_ENVIRONMENT=production explicitamente
 * (ver .github/workflows/ios.yml) e o default local e o sandbox.
 */
const apsEnvironment = process.env.APS_ENVIRONMENT === 'production' ? 'production' : 'development';

/**
 * O plugin do Google Sign-In precisa registrar o "reversed client ID" como URL
 * scheme para receber o callback. Ele e o proprio client ID de iOS invertido,
 * entao derivamos em vez de pedir um segundo secret que poderia divergir.
 * Sem client ID configurado o plugin nao entra: o build segue normalmente e o
 * botao some da tela (ver src/auth/googleSignIn.ts).
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const googleIosUrlScheme = googleIosClientId.endsWith('.apps.googleusercontent.com')
  ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
  : null;

/**
 * Dominio dos Universal Links. Um link /r/<token> compartilhado no WhatsApp
 * abre o app quando ele esta instalado e a pagina web quando nao esta — o que
 * so funciona com o apple-app-site-association servido em
 * https://feith.space/.well-known/ (ver front_fide/static/).
 */
/**
 * SDK da Meta, para medir instalacoes vindas dos anuncios (ver
 * src/ads/metaSdk.ts). Mesmo esquema do Google: sem app ID e client token o
 * plugin nao entra e o build segue sem medicao. O app ID e EXPO_PUBLIC porque
 * o JS tambem precisa saber se o SDK existe; o client token so vai para o
 * Info.plist.
 */
const metaAppId = process.env.EXPO_PUBLIC_META_APP_ID ?? '';
const metaClientToken = process.env.META_CLIENT_TOKEN ?? '';
const metaEnabled = Boolean(metaAppId && metaClientToken);

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? '';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://feith.space';
const webHost = webUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

const config: ExpoConfig = {
  name: 'feith',
  slug: 'feith',
  version: '1.0.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'feith',
  /**
   * 'light', nao 'automatic'.
   *
   * O app e claro por escolha: `schemes.light` esta fixo em tokens/ui/
   * ornaments/_layout/(tabs)/_layout e a StatusBar e "dark". Nao existe
   * paleta escura ligada — `schemes.dark` esta definido mas ninguem o usa.
   *
   * Declarar 'automatic' dizia ao iOS o contrario: "esta app suporta modo
   * escuro". Ai todo componente que consulta a trait collection do sistema
   * virava sozinho enquanto a nossa paleta seguia clara. Foi assim que os
   * blocos de Markdown do leitor sairam com fundo preto e tinta preta num
   * telefone no escuro (ver ReflexaoReader.tsx) — e o mesmo valia para o
   * teclado, os menus nativos e as folhas de acao.
   *
   * Quando houver modo escuro de verdade, isto volta a 'automatic' junto com
   * a paleta — as duas coisas na mesma mudanca.
   */
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.feith.app',
    appleTeamId: process.env.APPLE_TEAM_ID,
    icon: {
      light: './assets/icon.png',
      dark: './assets/icon-dark.png',
      tinted: './assets/icon-tinted.png',
    },
    // Escreve o entitlement com.apple.developer.applesignin no prebuild. Sem
    // ele o botao da Apple aparece e o signInAsync falha na hora.
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${webHost}`],
    entitlements: {
      // Declarado aqui em vez de deixar a cargo do plugin do expo-notifications:
      // o entitlement que sai do prebuild fica visivel no config, e o CI
      // consegue conferir o valor.
      'aps-environment': apsEnvironment,
    },
    infoPlist: {
      // O player continua tocando com a tela apagada e aparece no lockscreen.
      // Sem esta chave o audio para assim que o app vai para background.
      UIBackgroundModes: ['audio'],
      // Evita a pergunta de conformidade de exportacao a cada build enviado:
      // o app nao usa criptografia propria, so HTTPS.
      ITSAppUsesNonExemptEncryption: false,
      ...(isCleartextApi
        ? {
            NSAppTransportSecurity: {
              // Libera apenas a rede local, nao a internet inteira.
              NSAllowsLocalNetworking: true,
            },
          }
        : {}),
    },
  },
  android: {
    package: 'com.feith.app',
    versionCode: Number(process.env.ANDROID_VERSION_CODE) || 1,
    ...(googleServicesFile ? { googleServicesFile } : {}),
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#5C1D24',
      monochromeImage: './assets/icon-tinted.png',
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    // Picker nativo de data e hora — usado na data de nascimento e no horario
    // do lembrete diario. Digitar hora num campo de texto e pior em todos os
    // sentidos, e um app de habito depende desse horario estar certo.
    '@react-native-community/datetimepicker',
    // Sem condicional, diferente do Google: nao ha client ID para configurar, e
    // a disponibilidade e decidida em runtime por isAvailableAsync().
    'expo-apple-authentication',
    // Player do audio da reflexao (exclusivo de apoiador). O modo de audio em
    // si — tocar no silencioso, seguir em background — e configurado em runtime
    // por setAudioModeAsync (src/player/useAudioReflexao.ts); o que o plugin faz
    // e entrar no prebuild. O UIBackgroundModes: ['audio'] la em cima ja estava
    // declarado esperando por isto.
    //
    // O modulo tambem grava audio, e por padrao pede microfone nas duas
    // plataformas. O app so TOCA: uma permissao que nunca sera usada e um
    // pedido a mais na App Review e um aviso de privacidade a mais para quem
    // instala, sem nada em troca.
    [
      'expo-audio',
      { microphonePermission: false, recordAudioAndroid: false },
    ] as [string, Record<string, unknown>],
    // Registra o app no APNs e entrega o device token. Sem
    // enableBackgroundRemoteNotifications: as notificacoes sao puramente de
    // alerta, o app nao roda codigo em background ao receber uma.
    'expo-notifications',
    // No SDK 57 a splash deixou de ser chave de topo e virou config do plugin.
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        // Creme da identidade editorial (palette.js). Precisa ser IGUAL ao
        // canvas das telas: um off-white azulado aqui faz a abertura do app
        // piscar de branco para papel.
        backgroundColor: '#FAF8F4',
      },
    ],
    // A anotacao de tupla e necessaria: sem ela o TS infere (string | objeto)[]
    // e o tipo de `plugins` exige exatamente [nome, config].
    ...(googleIosUrlScheme
      ? ([
          ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }],
        ] as [string, Record<string, string>][])
      : []),
    ...(metaEnabled
      ? ([
          [
            'react-native-fbsdk-next',
            {
              appID: metaAppId,
              clientToken: metaClientToken,
              displayName: 'feith',
              scheme: `fb${metaAppId}`,
              // O SDK so inicia depois da pergunta do ATT, pelo JS. Iniciar
              // sozinho na abertura leria o ATT antes de a pessoa responder.
              isAutoInitEnabled: false,
              // E isto que registra a instalacao/abertura sem codigo nenhum.
              autoLogAppEventsEnabled: true,
              // O IDFA so sai do aparelho se a pessoa tocar em Permitir; negar
              // zera o identificador no proprio iOS.
              advertiserIDCollectionEnabled: true,
              // O texto do ATT fica com o plugin do expo-tracking-transparency,
              // abaixo. Dois plugins escrevendo a mesma chave e o ultimo ganha.
              iosUserTrackingPermission: false,
            },
          ],
          [
            'expo-tracking-transparency',
            {
              // Aparece no alerta do iOS logo abaixo de "Permitir que o feith
              // rastreie...". A App Review reprova texto vago ou que prometa
              // beneficio em troca do sim.
              userTrackingPermission:
                'Usamos isso para saber quais anúncios do feith trazem novas pessoas ao app. Seus estudos e anotações nunca são compartilhados.',
            },
          ],
        ] as [string, Record<string, unknown>][])
      : []),
  ],
  experiments: { typedRoutes: true },
  extra: {
    posthogProjectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
};

export default config;
