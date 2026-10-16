import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { api } from '../api/client';
import { formatRelativePT } from '../api/dates';
import type { BookmarkItem } from '../api/types';
import { BotaoFavorito } from '../components/BotaoFavorito';
import { FeedList } from '../components/FeedList';
import { GoldRule, ScreenHeader, Text, TouchableCard } from '../components/ui';
import { useListaPaginada } from '../hooks/useListaPaginada';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';

export function Favoritos({ seletor }: { seletor: ReactNode }) {
  const { scheme } = useTheme();
  const router = useRouter();
  const lista = useListaPaginada<BookmarkItem>(api.getBookmarks);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        overline="Caderno"
        title="Favoritos"
        right={
          lista.total > 0 ? (
            <Text variant="micro" color={scheme.textGhost}>
              {lista.total}
            </Text>
          ) : null
        }
      />

      {seletor}

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
    </View>
  );
}
