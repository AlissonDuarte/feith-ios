import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { TrailSummary } from '../../src/api/types';
import { Button, EmptyState, Loading, ScreenHeader } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { CATEGORIAS, type CategoriaTrilha } from '../../src/trilhas/categorias';
import { CartaoTrilha } from '../../src/trilhas/componentes';
import { useTheme } from '../../src/theme/ThemeContext';
import { space } from '../../src/theme/tokens';

function ehCategoria(valor: string | undefined): valor is CategoriaTrilha {
  return !!valor && valor in CATEGORIAS;
}

export default function CatalogoDaCategoria() {
  const { categoria } = useLocalSearchParams<{ categoria: string }>();
  const { scheme } = useTheme();
  const router = useRouter();
  const [trilhas, setTrilhas] = useState<TrailSummary[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const valida = ehCategoria(categoria);

  const carregar = useCallback(async () => {
    if (!valida) return;
    try {
      const catalogo = await api.getTrails();
      setTrilhas(catalogo.trails.filter(CATEGORIAS[categoria].filtro));
      setErro(null);
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [valida, categoria]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const abrir = (t: TrailSummary) => {
    posthog?.capture('trail_card_clicked', { trail: t.slug, tier: t.tier, kind: t.kind, locked: t.locked, origem: 'ver_mais' });
    router.push({ pathname: '/trilha/[slug]', params: { slug: t.slug } });
  };

  if (!valida) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icone="trail-sign-outline" titulo="Catálogo não encontrado" />
      </SafeAreaView>
    );
  }

  const { titulo, legenda } = CATEGORIAS[categoria];

  if (!trilhas && !erro) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        data={trilhas ?? []}
        keyExtractor={(t) => t.slug}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: space.gutter }}
        contentContainerStyle={{ paddingBottom: space.section * 2, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <ScreenHeader
            overline={trilhas ? `${legenda} · ${trilhas.length} trilhas` : legenda}
            title={titulo}
            style={{ marginBottom: space.md }}
          />
        }
        ListEmptyComponent={
          erro ? (
            <EmptyState icone="cloud-offline-outline" titulo="Não foi possível carregar" descricao={erro} />
          ) : (
            <EmptyState icone="trail-sign-outline" titulo="Nenhuma trilha por aqui ainda" />
          )
        }
        renderItem={({ item }) => <CartaoTrilha trilha={item} onPress={() => abrir(item)} style={{ width: undefined, flex: 1 }} />}
      />
      {erro && trilhas ? (
        <Button
          label="Tentar de novo"
          variant="quiet"
          style={{ marginHorizontal: space.gutter, marginBottom: space.md }}
          onPress={() => void carregar()}
        />
      ) : null}
    </SafeAreaView>
  );
}
