import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { api } from '../api/client';
import { formatRelativePT } from '../api/dates';
import type { HistoryItem } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BotaoFavorito } from '../components/BotaoFavorito';
import { FeedList } from '../components/FeedList';
import { Button, Card, Overline, Text, TouchableCard } from '../components/ui';
import { useListaPaginada } from '../hooks/useListaPaginada';
import { StreakCalendarGrid } from '../streak/StreakCalendarGrid';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';

function Calendario() {
  const { scheme } = useTheme();
  const router = useRouter();
  const agora = new Date();
  const [cursor, setCursor] = useState({ year: agora.getFullYear(), month: agora.getMonth() + 1 });
  const [dias, setDias] = useState<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      api
        .getStreakCalendar(cursor.year, cursor.month)
        .then((r) => {
          if (ativo) setDias(r.days_read);
        })
        .catch(() => undefined);
      return () => {
        ativo = false;
      };
    }, [cursor]),
  );

  function mover(delta: number) {
    setCursor((c) => {
      const data = new Date(c.year, c.month - 1 + delta, 1);
      return { year: data.getFullYear(), month: data.getMonth() + 1 };
    });
  }

  const noMesAtual = cursor.year === agora.getFullYear() && cursor.month === agora.getMonth() + 1;

  return (
    <View style={{ marginBottom: space.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.lg, marginBottom: space.xs }}>
        <Pressable onPress={() => mover(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={18} color={scheme.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => mover(1)}
          disabled={noMesAtual}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          style={{ opacity: noMesAtual ? 0.35 : 1 }}
        >
          <Ionicons name="chevron-forward" size={18} color={scheme.textMuted} />
        </Pressable>
      </View>
      <Pressable onPress={() => router.push('/perfil/sequencia')} accessibilityRole="button" accessibilityLabel="Ver sua sequência">
        <StreakCalendarGrid year={cursor.year} month={cursor.month} daysRead={dias} scheme={scheme} />
      </Pressable>
    </View>
  );
}

export function Leituras() {
  const { scheme } = useTheme();
  const router = useRouter();
  const { summary, isSupporter } = useAuth();
  const lista = useListaPaginada<HistoryItem>(api.getHistory);
  const janela = summary?.history_window_days ?? null;

  return (
    <FeedList
      lista={lista}
      chave={(h) => h.reflection_uuid}
      placeholderBusca="Buscar por livro ou trecho"
      iconeVazio="library-outline"
      tituloVazio="Nada no acervo ainda"
      descricaoVazia="As reflexões que você abrir aparecem aqui."
      cabecalho={
        <>
          <Calendario />
          {!isSupporter && janela ? (
            <Card quiet style={{ marginBottom: space.xl }}>
              <Overline>Plano gratuito</Overline>
              <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 6 }}>
                {`Aqui ficam os últimos ${janela} dias. Apoiadores veem o acervo completo.`}
              </Text>
              <Button
                label="Conhecer plano Apoiador"
                variant="ghost"
                size="sm"
                icon="arrow-forward"
                style={{ marginTop: space.sm, alignSelf: 'flex-start' }}
                onPress={() => router.push({ pathname: '/assinatura', params: { origem: 'historico' } })}
              />
            </Card>
          ) : null}
        </>
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
              <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.sm }} numberOfLines={2}>
                {item.bible_text}
              </Text>
              <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.md }}>
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
  );
}
