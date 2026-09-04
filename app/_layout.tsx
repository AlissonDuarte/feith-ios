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
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
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

    if (inAuthGroup || (noOnboarding && summary?.onboarding_completed)) {
      router.replace('/(tabs)/hoje');
    }
  }, [token, loading, summary, segments, router]);

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
