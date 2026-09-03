import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import type { BookmarkItem } from '../../src/api/types';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { FeedList } from '../../src/components/FeedList';
import { Card, Text, scheme } from '../../src/components/ui';
import { useListaPaginada } from '../../src/hooks/useListaPaginada';

export default function Favoritos() {
  const router = useRouter();
  const lista = useListaPaginada<BookmarkItem>(api.getBookmarks);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="display" display weight="bold">
          Favoritos
        </Text>
      </View>

      <FeedList
        lista={lista}
        chave={(b) => b.reflection_uuid}
        placeholderBusca="Buscar nos favoritos"
        tituloVazio="Nenhum favorito ainda"
        descricaoVazia="Toque na estrela ao ler uma reflexão para guardá-la aqui."
        renderItem={(item) => (
          <Pressable
            onPress={() => router.push(`/leitura/${item.reflection_uuid}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="title" display weight="bold">
                    {item.scripture_reference}
                  </Text>
                  <Text
                    variant="body"
                    color={scheme.textSecondary}
                    style={{ marginTop: 6 }}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                  <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 10 }}>
                    {item.notes > 0
                      ? `${item.notes} ${item.notes === 1 ? 'anotação' : 'anotações'} · `
                      : ''}
                    {formatRelativePT(item.createdAt)}
                  </Text>
                </View>

                {/* Desfavoritar aqui remove o item da lista na hora — deixá-lo
                    com a estrela vazia seria um estado sem sentido nesta tela. */}
                <View style={{ paddingLeft: 12 }}>
                  <BotaoFavorito
                    reflectionUuid={item.reflection_uuid}
                    favoritado
                    tamanho={22}
                    onMudou={(v) => {
                      if (!v) lista.removerLocal((b) => b.reflection_uuid === item.reflection_uuid);
                    }}
                  />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
