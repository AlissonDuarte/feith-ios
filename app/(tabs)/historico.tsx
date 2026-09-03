import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import type { HistoryItem } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { FeedList } from '../../src/components/FeedList';
import { Card, Text, scheme } from '../../src/components/ui';
import { useListaPaginada } from '../../src/hooks/useListaPaginada';

export default function Historico() {
  const router = useRouter();
  const { summary, isSupporter } = useAuth();
  const lista = useListaPaginada<HistoryItem>(api.getHistory);

  // O backend ja trunca o historico do plano gratuito (history_service.py:32).
  // Dizer isso na tela evita que a lista curta pareça um bug — mas sem citar
  // preço nem oferecer compra: no iOS isso é território do StoreKit, e a
  // diretriz 3.1.1 recusa qualquer outro caminho.
  const janela = summary?.history_window_days ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="display" display weight="bold">
          Histórico
        </Text>
      </View>

      <FeedList
        lista={lista}
        chave={(h) => h.reflection_uuid}
        placeholderBusca="Buscar no histórico"
        tituloVazio="Nada no histórico ainda"
        descricaoVazia="As reflexões que você abrir aparecem aqui."
        cabecalho={
          !isSupporter && janela ? (
            <Card style={{ marginBottom: 16, backgroundColor: scheme.accentSubtle }}>
              <Text variant="caption" color={scheme.textSecondary}>
                No plano gratuito, o histórico mostra os últimos {janela} dias. Apoiadores veem o
                acervo completo.
              </Text>
            </Card>
          ) : null
        }
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
                    {item.bible_text}
                  </Text>
                  <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 10 }}>
                    {formatRelativePT(item.publishAt)}
                    {item.notes_count > 0
                      ? ` · ${item.notes_count} ${item.notes_count === 1 ? 'anotação' : 'anotações'}`
                      : ''}
                  </Text>
                </View>

                <View style={{ paddingLeft: 12 }}>
                  <BotaoFavorito
                    reflectionUuid={item.reflection_uuid}
                    favoritado={item.bookmarked}
                    tamanho={22}
                    onMudou={(v) =>
                      lista.atualizarLocal(
                        (h) => h.reflection_uuid === item.reflection_uuid,
                        (h) => ({ ...h, bookmarked: v }),
                      )
                    }
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
