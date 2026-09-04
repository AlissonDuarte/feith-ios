import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import type { BookmarkItem } from '../../src/api/types';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { FeedList } from '../../src/components/FeedList';
import { GoldRule, ScreenHeader, Text, TouchableCard, scheme } from '../../src/components/ui';
import { useListaPaginada } from '../../src/hooks/useListaPaginada';
import { space } from '../../src/theme/tokens';

export default function Favoritos() {
  const router = useRouter();
  const lista = useListaPaginada<BookmarkItem>(api.getBookmarks);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <ScreenHeader
        overline="Guardadas"
        title="Favoritos"
        right={
          lista.total > 0 ? (
            <Text variant="micro" color={scheme.textGhost}>
              {lista.total}
            </Text>
          ) : null
        }
      />

      <FeedList
        lista={lista}
        chave={(b) => b.reflection_uuid}
        placeholderBusca="Buscar nos favoritos"
        iconeVazio="bookmark-outline"
        tituloVazio="Nenhum favorito ainda"
        descricaoVazia="Toque no marcador ao ler uma reflexão para guardá-la aqui."
        renderItem={(item) => (
          <TouchableCard
            onPress={() => router.push(`/leitura/${item.reflection_uuid}`)}
            accessibilityLabel={item.scripture_reference}
            style={{ marginBottom: space.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: space.md }}>
                <Text variant="title">{item.scripture_reference}</Text>

                <GoldRule align="left" width={28} style={{ marginTop: space.md }} />

                <Text
                  variant="bodySm"
                  color={scheme.textSecondary}
                  style={{ marginTop: space.md }}
                  numberOfLines={3}
                >
                  {item.description}
                </Text>

                <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.lg }}>
                  {[
                    item.version,
                    item.notes > 0
                      ? `${item.notes} ${item.notes === 1 ? 'anotação' : 'anotações'}`
                      : null,
                    formatRelativePT(item.createdAt),
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </View>

              {/* Desfavoritar aqui remove o item da lista na hora — deixá-lo
                  com o marcador vazio seria um estado sem sentido nesta tela. */}
              <BotaoFavorito
                reflectionUuid={item.reflection_uuid}
                favoritado
                onMudou={(v) => {
                  if (!v) lista.removerLocal((b) => b.reflection_uuid === item.reflection_uuid);
                }}
              />
            </View>
          </TouchableCard>
        )}
      />
    </SafeAreaView>
  );
}
