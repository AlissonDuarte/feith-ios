import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { TrailCatalog, TrailSummary } from '../../src/api/types';
import { EmptyState, Loading, Overline, Text, useEspacoTabBar } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { filtrarTrilhas, type FiltroTrilhas } from '../../src/leitura/regras';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts, radius, shadow, space } from '../../src/theme/tokens';
import { AnelProgresso, LinhaTrilha } from '../../src/trilhas/componentes';

const FILTROS: { valor: FiltroTrilhas; rotulo: string }[] = [
  { valor: 'para_voce', rotulo: 'Para você' },
  { valor: 'curtas', rotulo: 'Curtas' },
  { valor: 'livros', rotulo: 'Livros' },
  { valor: 'duas_vozes', rotulo: 'Duas Vozes' },
];

export default function Trilhas() {
  const { scheme, effectiveMode } = useTheme();
  const router = useRouter();
  const { respiro } = useEspacoTabBar();
  const [catalogo, setCatalogo] = useState<TrailCatalog | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroTrilhas>('para_voce');

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

  const abrir = (t: TrailSummary, origem: 'continuar' | 'lista') => {
    posthog?.capture('trail_card_clicked', { trail: t.slug, tier: t.tier, kind: t.kind, locked: t.locked, origem, filtro });
    router.push({ pathname: '/trilha/[slug]', params: { slug: t.slug } });
  };

  if (!catalogo && !erro) return <Loading />;

  const trilhas = catalogo?.trails ?? [];
  const ativa = catalogo?.active;
  const progressoAtiva = ativa?.progress;
  const corDestaque = effectiveMode === 'dark' ? scheme.onAccentMuted : scheme.goldSoft;
  const visiveis = filtrarTrilhas(trilhas, filtro, ativa?.slug);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: respiro }}
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
        <Text variant="display" accessibilityRole="header">
          Pequenos passos, todo dia
        </Text>

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
                  { backgroundColor: scheme.accent, ...shadow.card },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <AnelProgresso feitos={progressoAtiva.completed_days} total={ativa.days_count} tamanho={46} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="overline" font="bodySemi" color={scheme.onAccentMuted}>
                    Continuar trilha
                  </Text>
                  <Text
                    style={{ fontFamily: fonts.serifSemi, fontSize: 21, lineHeight: 25, color: scheme.onAccent }}
                    numberOfLines={1}
                  >
                    {ativa.name}
                  </Text>
                  {catalogo?.active_next_title && progressoAtiva.next_day ? (
                    <Text variant="micro" color={scheme.onAccentMuted} numberOfLines={1}>
                      {`Dia ${progressoAtiva.next_day} · ${catalogo.active_next_title} · ${ativa.minutes_per_day} min`}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={corDestaque} />
              </View>
            )}
          </Pressable>
        ) : null}

        {trilhas.length > 0 ? (
          <>
            <View style={estilos.filtros} accessibilityRole="tablist">
              {FILTROS.map((f) => {
                const ativo = f.valor === filtro;
                return (
                  <Pressable
                    key={f.valor}
                    onPress={() => {
                      setFiltro(f.valor);
                      posthog?.capture('trail_filter_selected', { filtro: f.valor });
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: ativo }}
                    style={[
                      estilos.filtro,
                      { borderColor: scheme.border, backgroundColor: scheme.surface },
                      ativo && { backgroundColor: scheme.textPrimary, borderColor: scheme.textPrimary },
                    ]}
                  >
                    <Text
                      variant="caption"
                      font={ativo ? 'bodySemi' : 'bodyMedium'}
                      color={ativo ? scheme.canvas : scheme.textSecondary}
                    >
                      {f.rotulo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {filtro === 'para_voce' ? (
              <Overline style={{ marginTop: space.lg }}>{ativa ? 'O próximo degrau' : 'Para começar'}</Overline>
            ) : null}

            <View style={{ marginTop: space.xs }}>
              {visiveis.map((t) => (
                <LinhaTrilha key={t.slug} trilha={t} onPress={() => abrir(t, 'lista')} />
              ))}
              {visiveis.length === 0 ? (
                <Text variant="bodySm" color={scheme.textMuted} style={{ marginTop: space.lg, textAlign: 'center' }}>
                  Nenhuma trilha neste filtro por enquanto.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  continuar: {
    marginTop: space.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.lg },
  filtro: {
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
