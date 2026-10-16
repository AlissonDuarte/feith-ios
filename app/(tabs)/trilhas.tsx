import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { TrailCatalog, TrailSummary } from '../../src/api/types';
import { EmptyState, Loading, ScreenHeader, Text, useEspacoTabBar } from '../../src/components/ui';
import { AnelProgresso, CartaoTrilha } from '../../src/trilhas/componentes';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts, radius, shadow, space } from '../../src/theme/tokens';

function Prateleira({
  titulo,
  legenda,
  trilhas,
  abrir,
}: {
  titulo: string;
  legenda: string;
  trilhas: TrailSummary[];
  abrir: (t: TrailSummary) => void;
}) {
  const { scheme } = useTheme();
  if (trilhas.length === 0) return null;
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={estilos.prateleiraTopo}>
        <Text style={{ fontFamily: fonts.serifSemi, fontSize: 21, lineHeight: 24, color: scheme.textPrimary }}>{titulo}</Text>
        <Text variant="micro" color={scheme.textMuted}>
          {legenda}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: space.gutter, marginTop: space.sm }}
      >
        {trilhas.map((t) => (
          <CartaoTrilha key={t.slug} trilha={t} onPress={() => abrir(t)} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function Trilhas() {
  const { scheme, effectiveMode } = useTheme();
  const router = useRouter();
  const { respiro } = useEspacoTabBar();
  const [catalogo, setCatalogo] = useState<TrailCatalog | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setCatalogo(await api.getTrails());
      setErro(null);
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const abrir = (t: TrailSummary) => router.push({ pathname: '/trilha/[slug]', params: { slug: t.slug } });

  if (!catalogo && !erro) return <Loading />;

  const trilhas = catalogo?.trails ?? [];
  const gratis = trilhas.filter((t) => t.tier === 'free');
  const duasVozes = trilhas.filter((t) => t.tier !== 'free' && t.kind === 'duas_vozes');
  const apoiadores = trilhas.filter((t) => t.tier !== 'free' && t.kind !== 'duas_vozes');
  const ativa = catalogo?.active;
  const progressoAtiva = ativa?.progress;
  const corDestaque = effectiveMode === 'dark' ? scheme.onAccentMuted : scheme.goldSoft;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: respiro }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={async () => {
              setAtualizando(true);
              await carregar();
              setAtualizando(false);
            }}
            tintColor={scheme.accent}
          />
        }
      >
        <ScreenHeader overline="Trilhas" title="Pequenos passos, todo dia" />

        {erro && !catalogo ? (
          <EmptyState icone="cloud-offline-outline" titulo="Não foi possível carregar" descricao={erro} />
        ) : trilhas.length === 0 ? (
          <EmptyState
            icone="trail-sign-outline"
            titulo="As trilhas estão chegando"
            descricao="Em breve você vai poder seguir trilhas curtas, um passo por dia."
          />
        ) : null}

        {ativa && progressoAtiva ? (
          <Pressable
            onPress={() => abrir(ativa)}
            accessibilityRole="button"
            accessibilityLabel={`Continuar ${ativa.name}`}
          >
            {({ pressed }) => (
              <View
                style={[
                  estilos.continuar,
                  { backgroundColor: scheme.accent, ...shadow.raised },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <AnelProgresso feitos={progressoAtiva.completed_days} total={ativa.days_count} />
                <View style={{ flex: 1 }}>
                  <Text style={[estilos.continuarRotulo, { color: corDestaque }]}>CONTINUAR</Text>
                  <Text
                    style={{ fontFamily: fonts.serifSemi, fontSize: 21, lineHeight: 24, color: scheme.onAccent, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {ativa.name}
                  </Text>
                  {catalogo?.active_next_title && progressoAtiva.next_day ? (
                    <Text variant="micro" color={scheme.onAccentMuted} style={{ marginTop: 3 }} numberOfLines={1}>
                      {`Dia ${progressoAtiva.next_day} · "${catalogo.active_next_title}" · ${ativa.minutes_per_day} min`}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={corDestaque} />
              </View>
            )}
          </Pressable>
        ) : null}

        <Prateleira titulo="Para começar" legenda="Grátis" trilhas={gratis} abrir={abrir} />
        <Prateleira titulo="Em Duas Vozes" legenda="Protestante e católica" trilhas={duasVozes} abrir={abrir} />
        <Prateleira titulo="Para Apoiadores" legenda="Trilhas completas" trilhas={apoiadores} abrir={abrir} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  prateleiraTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
  },
  continuar: {
    marginHorizontal: space.gutter,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  continuarRotulo: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 14, letterSpacing: 2 },
});
