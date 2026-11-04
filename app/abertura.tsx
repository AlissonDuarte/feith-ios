import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { api } from '../src/api/client';
import { mensagemDe } from '../src/api/errors';
import { useAuth } from '../src/auth/AuthContext';
import { Text } from '../src/components/ui';
import { posthog } from '../src/config/posthog';
import { trechoDoVersiculo } from '../src/leitura/regras';
import { fonts, radius, space } from '../src/theme/tokens';
import { getLocalFallbackVerse } from '../src/widgets/fallbackVerses';

const CREME = '#F5EFE3';
const OURO = '#D8C79A';

export default function Abertura() {
  const router = useRouter();
  const { signIn, token } = useAuth();
  const criando = useRef(false);
  const focada = useIsFocused();
  const [versiculo, setVersiculo] = useState(() => getLocalFallbackVerse(new Date()));
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWidgetTeaser()
      .then((teaser) => setVersiculo({ scripture_reference: teaser.scripture_reference, excerpt: teaser.excerpt }))
      .catch(() => undefined);
    posthog?.capture('opening_viewed');
  }, []);

  useEffect(() => {
    if (focada && token && !criando.current) router.replace('/(tabs)/hoje');
  }, [focada, token, router]);

  async function comecar() {
    if (criando.current || token) return;
    criando.current = true;
    setErro(null);
    setEntrando(true);
    posthog?.capture('opening_cta_tapped');
    try {
      await signIn(await api.createGuest());
    } catch (e) {
      posthog?.capture('opening_guest_failed', {
        status: (e as { status?: number }).status ?? null,
        error_message: mensagemDe(e),
      });
      setErro(mensagemDe(e));
      setEntrando(false);
      criando.current = false;
      return;
    }
    const hoje = await api.getDailyReflection().catch(() => null);
    if (hoje?.uuid) {
      router.replace({
        pathname: '/leitura/[key]',
        params: { key: hoje.uuid, modo: 'curta', primeira: '1', hoje: '1' },
      });
    } else {
      router.replace('/(tabs)/hoje');
    }
    setEntrando(false);
    criando.current = false;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#2E0C0D' }}>
      <StatusBar style="light" />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="fundo" cx="50%" cy="18%" rx="120%" ry="70%">
            <Stop offset="0" stopColor="#8E2A2A" />
            <Stop offset="0.46" stopColor="#6E1C1C" />
            <Stop offset="1" stopColor="#2E0C0D" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#fundo)" />
        {[70, 130, 190].map((raio) => (
          <Circle key={raio} cx="72%" cy="150" r={raio} stroke={OURO} strokeOpacity={0.2} fill="none" />
        ))}
      </Svg>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={require('../assets/icon.png')} style={estilos.icone} accessibilityIgnoresInvertColors />
            <Text style={estilos.marca}>feith</Text>
          </View>

          <View style={{ marginTop: 'auto', paddingTop: space.section }}>
            <Text aria-hidden style={estilos.aspas}>
              “
            </Text>
            <Text variant="overline" font="bodySemi" color={OURO}>
              {`Hoje · ${versiculo.scripture_reference}`}
            </Text>
            <Text accessibilityRole="header" style={estilos.versiculo}>
              {trechoDoVersiculo(versiculo.excerpt)}
            </Text>
            <Text style={estilos.pergunta}>Você leu. Mas entendeu?</Text>
            <Text style={estilos.promessa}>
              Todo dia, uma passagem explicada com rigor: contexto, exegese, doutrina, aplicação e oração.
            </Text>
          </View>

          <View style={{ marginTop: space.xxl }}>
            <Pressable
              onPress={() => void comecar()}
              disabled={entrando}
              accessibilityRole="button"
              accessibilityLabel="Ler a reflexão de hoje"
              accessibilityState={{ busy: entrando }}
            >
              {({ pressed }) => (
                <View style={[estilos.botao, pressed && { opacity: 0.88 }]}>
                  {entrando ? (
                    <ActivityIndicator color="#5C1616" />
                  ) : (
                    <>
                      <Text variant="bodySm" font="bodySemi" color="#5C1616" style={{ fontSize: 15.5, lineHeight: 20 }}>
                        Ler a reflexão de hoje
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#5C1616" />
                    </>
                  )}
                </View>
              )}
            </Pressable>

            {erro ? (
              <Text variant="caption" color={OURO} style={{ textAlign: 'center', marginTop: space.md }}>
                {erro}
              </Text>
            ) : (
              <Text variant="caption" color="rgba(245,239,227,0.8)" style={{ textAlign: 'center', marginTop: space.md }}>
                Leva 1 minuto. Sem cadastro.
              </Text>
            )}

            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={10}
              accessibilityRole="button"
              style={{ alignSelf: 'center', marginTop: space.xl, marginBottom: space.lg }}
            >
              <Text variant="bodySm" font="bodyMedium" color={CREME} style={{ textDecorationLine: 'underline' }}>
                Já tenho conta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flexGrow: 1, paddingHorizontal: 28, paddingTop: space.lg },
  icone: { width: 32, height: 32, borderRadius: 8 },
  marca: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, color: CREME },
  aspas: {
    fontFamily: fonts.serif,
    fontSize: 150,
    lineHeight: 110,
    height: 78,
    color: 'rgba(216,199,154,0.34)',
    marginLeft: -6,
  },
  versiculo: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.6,
    color: CREME,
    marginTop: 14,
  },
  pergunta: {
    fontFamily: fonts.serifItalic,
    fontSize: 30,
    lineHeight: 37,
    color: OURO,
    marginTop: 18,
  },
  promessa: {
    fontFamily: fonts.body,
    fontSize: 16.5,
    lineHeight: 25,
    color: 'rgba(245,239,227,0.86)',
    marginTop: space.lg,
  },
  botao: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radius.sharp,
    backgroundColor: '#FAF3E2',
  },
});
