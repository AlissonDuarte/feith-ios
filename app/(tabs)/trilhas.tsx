import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { TrailCatalog, TrailSummary } from '../../src/api/types';
import { EmptyState, Loading, ScreenHeader, Text, useEspacoTabBar } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { AnelProgresso, CartaoTrilha, CartaoVerMais } from '../../src/trilhas/componentes';
import { CATEGORIAS, LIMITE_PRATELEIRA, type CategoriaTrilha } from '../../src/trilhas/categorias';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts, radius, shadow, space } from '../../src/theme/tokens';

function Prateleira({
  categoria,
  trilhas,
  abrir,
  verMais,
}: {
  categoria: CategoriaTrilha;
  trilhas: TrailSummary[];
  abrir: (t: TrailSummary) => void;
  verMais: (categoria: CategoriaTrilha) => void;
}) {
  const { scheme } = useTheme();
  if (trilhas.length === 0) return null;
  const { titulo, legenda } = CATEGORIAS[categoria];
  const excede = trilhas.length > LIMITE_PRATELEIRA;
  const visiveis = excede ? trilhas.slice(0, LIMITE_PRATELEIRA - 1) : trilhas;
  const restantes = trilhas.length - visiveis.length;
  return (
    <View style={{ marginTop: space.xl }}>
      <View style={estilos.prateleiraTopo}>
        <Text style={{ fontFamily: fonts.serifSemi, fontSize: 21, lineHeight: 24, color: scheme.textPrimary }}>{titulo}</Text>
        <Text variant="micro" color={scheme.textMuted}>
          {`${legenda} · ${trilhas.length}`}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: space.gutter, marginTop: space.sm }}
      >
        {visiveis.map((t) => (
          <CartaoTrilha key={t.slug} trilha={t} onPress={() => abrir(t)} style={{ width: 152 }} />
        ))}
        {restantes > 0 ? (
          <CartaoVerMais restantes={restantes} onPress={() => verMais(categoria)} style={{ width: 152 }} />
        ) : null}
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

  const abrir = (t: TrailSummary, origem: 'continuar' | 'prateleira') => {
    posthog?.capture('trail_card_clicked', { trail: t.slug, tier: t.tier, kind: t.kind, locked: t.locked, origem });
    router.push({ pathname: '/trilha/[slug]', params: { slug: t.slug } });
  };

  const verMais = (categoria: CategoriaTrilha) => {
    posthog?.capture('trail_shelf_more_clicked', { categoria });
    router.push({ pathname: '/trilhas/[categoria]', params: { categoria } });
  };

  if (!catalogo && !erro) return <Loading />;

  const trilhas = catalogo?.trails ?? [];
  const gratis = trilhas.filter(CATEGORIAS.gratis.filtro);
  const duasVozes = trilhas.filter(CATEGORIAS.duas_vozes.filtro);
  const apoiadores = trilhas.filter(CATEGORIAS.apoiadores.filtro);
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
            onPress={() => abrir(ativa, 'continuar')}
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

        <Prateleira categoria="gratis" trilhas={gratis} abrir={(t) => abrir(t, 'prateleira')} verMais={verMais} />
        <Prateleira categoria="duas_vozes" trilhas={duasVozes} abrir={(t) => abrir(t, 'prateleira')} verMais={verMais} />
        <Prateleira categoria="apoiadores" trilhas={apoiadores} abrir={(t) => abrir(t, 'prateleira')} verMais={verMais} />
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
