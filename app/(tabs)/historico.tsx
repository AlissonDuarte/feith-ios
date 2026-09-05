import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import type { HistoryItem } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { FeedList } from '../../src/components/FeedList';
import {
  Button,
  Card,
  GoldRule,
  Overline,
  ScreenHeader,
  Text,
  TouchableCard,
  scheme,
} from '../../src/components/ui';
import { useListaPaginada } from '../../src/hooks/useListaPaginada';
import { space } from '../../src/theme/tokens';

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
      <ScreenHeader
        overline="Suas leituras"
        title="Histórico"
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
        chave={(h) => h.reflection_uuid}
        placeholderBusca="Buscar no histórico"
        iconeVazio="time-outline"
        tituloVazio="Nada no histórico ainda"
        descricaoVazia="As reflexões que você abrir aparecem aqui."
        cabecalho={
          !isSupporter && janela ? (
            <Card quiet style={{ marginBottom: space.xl }}>
              <Overline color={scheme.gold}>Plano gratuito</Overline>
              <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 6 }}>
                O histórico mostra os últimos {janela} dias. Apoiadores veem o acervo completo.
              </Text>
              <Button
                label="Conhecer plano Apoiador"
                variant="ghost"
                size="sm"
                icon="arrow-forward"
                style={{ marginTop: space.sm, alignSelf: 'flex-start' }}
                onPress={() => router.push('/assinatura')}
              />
            </Card>
          ) : null
        }
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
                  {item.bible_text}
                </Text>

                <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.lg }}>
                  {[
                    formatRelativePT(item.publishAt),
                    item.notes_count > 0
                      ? `${item.notes_count} ${item.notes_count === 1 ? 'anotação' : 'anotações'}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </View>

              <BotaoFavorito
                reflectionUuid={item.reflection_uuid}
                favoritado={item.bookmarked}
                onMudou={(v) =>
                  lista.atualizarLocal(
                    (h) => h.reflection_uuid === item.reflection_uuid,
                    (h) => ({ ...h, bookmarked: v }),
                  )
                }
              />
            </View>
          </TouchableCard>
        )}
      />
    </SafeAreaView>
  );
}
