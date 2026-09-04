import '../global.css';

// Importadas por SUBPATH, uma a uma, e nao da raiz do pacote.
// `@expo-google-fonts/inter` reexporta os 18 pesos; importar de la coloca ~12MB
// de TTF no app para usar cinco faces. Confirmado com `npx expo export`.
//
// O Cormorant entra em quatro cortes porque a identidade editorial vive no
// peso BAIXO da serifada (o `font-light` de todos os titulos da landing) e na
// italica das citacoes e numerais. Sem o 300 e o italico, o Cormorant vira
// apenas "uma serifada", e era isso que a tela parecia.
import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light';
import { CormorantGaramond_400Regular } from '@expo-google-fonts/cormorant-garamond/400Regular';
import { CormorantGaramond_400Regular_Italic } from '@expo-google-fonts/cormorant-garamond/400Regular_Italic';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { fonts, schemes } from '../src/theme/tokens';
import { usePushNotifications } from '../src/push/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const schemeAtual = schemes.light;

/**
 * Rotas que funcionam sem sessao.
 *
 * `r` e o link compartilhado: alguem recebe no WhatsApp e abre sem ter conta —
 * e o canal de aquisicao do produto, entao mandar para o login seria perder a
 * visita. `politicas` precisa ser alcancavel deslogado porque a App Review
 * exige.
 */
const ROTAS_PUBLICAS = ['r', 'politicas'];

/**
 * Header nativo no estilo editorial, para as telas fora das abas.
 *
 * Titulo em Cormorant e nao em Inter — a serifada e quem nomeia no app
 * inteiro, e a barra de navegacao e onde o nome da reflexao aparece. O
 * `headerShadowVisible: false` tira a linha cinza que o iOS desenha por
 * padrao: sobre creme ela le como sujeira, e o proprio conteudo ja separa.
 */
function header({ title, voltar }: { title?: string; voltar: string }) {
  return {
    headerShown: true,
    ...(title ? { title } : {}),
    headerBackTitle: voltar,
    headerShadowVisible: false,
    headerTintColor: schemeAtual.accent,
    headerStyle: { backgroundColor: schemeAtual.canvas },
    headerTitleStyle: {
      fontFamily: fonts.serifSemi,
      fontSize: 20,
      color: schemeAtual.textPrimary,
    },
  } as const;
}

/**
 * Guard central de rota.
 *
 * A web nao tem nada disso: as paginas /user/** renderizam sempre e deixam os
 * fetches falharem, e um 401 vira um toast que nao leva a lugar nenhum. Aqui a
 * decisao vive num lugar so.
 */
function RouteGuard() {
  const { token, loading, summary } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  // Aqui dentro por dois motivos: precisa do AuthProvider acima (o registro so
  // vale com sessao) e do router, para o toque na notificacao navegar.
  usePushNotifications();

  useEffect(() => {
    if (loading) return;

    const raiz = segments[0];
    const inAuthGroup = raiz === '(auth)';
    const inPublicRoute = ROTAS_PUBLICAS.includes(raiz as string);
    const noOnboarding = raiz === 'onboarding';

    // A rota "/" e o app/index.tsx, que so existe para a raiz ter onde montar.
    // Ela nao e destino: quem para nela nao ve tela nenhuma.
    //
    // E onde TODA abertura a frio comeca. Deslogado nao doia, porque o ramo do
    // login abaixo tira a pessoa dali; logado, nenhum ramo casava (a raiz nao e
    // "(auth)" nem "onboarding") e a sessao persistida terminava em branco.
    //
    // Pelo pathname e nao por `segments.length === 0`: com typedRoutes ligado o
    // TS tipa o comprimento como `1 | 2`, entao a comparacao com 0 nem compila
    // — e depender do formato interno do array para reconhecer a raiz seria
    // frouxo de qualquer forma. O pathname da raiz e "/" e ponto.
    const naRaiz = pathname === '/';

    if (!token && !inAuthGroup && !inPublicRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (!token) return;

    // Onboarding pendente tem precedencia sobre qualquer destino logado. A
    // condicao exige `summary` carregado: enquanto ele e null nao da para
    // distinguir "ainda nao concluiu" de "ainda nao sabemos", e redirecionar
    // no escuro faria a tela piscar em toda abertura.
    if (summary && !summary.onboarding_completed && !noOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // `naRaiz` sai daqui mesmo com `summary` ainda null. E de proposito: se o
    // summary nunca chegar (offline, cache vazio), esperar por ele deixaria a
    // pessoa presa na tela branca para sempre. A Hoje trata erro de rede
    // sozinha, e se o summary chegar depois dizendo que o onboarding esta
    // pendente, o ramo acima roda de novo (o efeito depende de `summary`) e
    // leva para la.
    if (inAuthGroup || naRaiz || (noOnboarding && summary?.onboarding_completed)) {
      router.replace('/(tabs)/hoje');
    }
  }, [token, loading, summary, segments, pathname, router]);

  // Stack e nao Slot: as telas fora das abas (leitura, link compartilhado,
  // politicas) precisam de header nativo, botao de voltar e do gesto de
  // arrastar da borda. Com Slot elas apareceriam sem nenhuma forma de sair.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: schemeAtual.canvas } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="leitura/[key]" options={header({ voltar: 'Voltar' })} />
      <Stack.Screen name="politicas" options={header({ title: 'Privacidade', voltar: 'Voltar' })} />
      <Stack.Screen name="perfil/editar" options={header({ title: 'Editar perfil', voltar: 'Perfil' })} />
      <Stack.Screen name="perfil/notificacoes" options={header({ title: 'Lembretes', voltar: 'Perfil' })} />
      <Stack.Screen name="r/[token]" options={{ headerShown: false }} />
      {/* Sem gesto de voltar: sair pelo swipe deixaria a pessoa numa tela
          logada com o onboarding pendente, e o guard a traria de volta. */}
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Some com a splash mesmo se uma fonte falhar — melhor um fallback de
    // sistema do que um app travado na splash.
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* `dark` e nao `auto`: as telas sao creme em qualquer modo do
            sistema, entao deixar o iOS decidir pelo tema do aparelho
            produziria icones brancos sobre papel no modo escuro. */}
        <StatusBar style="dark" />
        <RouteGuard />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
