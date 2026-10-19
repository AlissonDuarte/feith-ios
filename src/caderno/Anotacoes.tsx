import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { api } from '../api/client';
import { formatRelativePT } from '../api/dates';
import { mensagemDe } from '../api/errors';
import type { NoteItem } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FeedList } from '../components/FeedList';
import { GoldRule, Overline, ScreenHeader, Text, TouchableCard } from '../components/ui';
import { useListaPaginada } from '../hooks/useListaPaginada';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';

export function Anotacoes({ seletor }: { seletor: ReactNode }) {
  const { scheme } = useTheme();
  const router = useRouter();
  const { refreshSummary } = useAuth();
  const lista = useListaPaginada<NoteItem>(api.getNotes);

  const apagar = useCallback(
    (nota: NoteItem) => {
      Alert.alert('Apagar anotação?', 'Esta ação não pode ser desfeita.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            // Some da lista na hora; se o servidor recusar, volta.
            lista.removerLocal((n) => n.note_uuid === nota.note_uuid);
            try {
              await api.deleteNote(nota.note_uuid, nota.reflection_uuid);
              void refreshSummary();
            } catch (e) {
              Alert.alert('Não foi possível apagar', mensagemDe(e));
              void lista.recarregar();
            }
          },
        },
      ]);
    },
    [lista, refreshSummary],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader
        overline="Caderno"
        title="Anotações"
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
        chave={(n) => n.note_uuid}
        placeholderBusca="Buscar nas anotações"
        iconeVazio="document-text-outline"
        tituloVazio="Nenhuma anotação ainda"
        descricaoVazia="Ao ler uma reflexão, toque em Anotar para guardar o que ela te disse."
        renderItem={(nota) => (
          <TouchableCard
            onPress={() =>
              // Reflexao de trilha nao promovida nao tem publish_at, e
              // /leitura/[key] (GET /reflections/daily) exige esse campo —
              // por isso essas abrem pela tela da trilha, nao pela generica.
              nota.trail_slug
                ? router.push(`/trilha/${nota.trail_slug}/dia/${nota.trail_day_number}`)
                : router.push(`/leitura/${nota.reflection_uuid}`)
            }
            accessibilityLabel={`Anotação em ${nota.reflection_verse}`}
            style={{ marginBottom: space.md }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: space.md }}>
                {/* A referencia e o CONTEXTO da anotacao, nao o titulo dela —
                    por isso etiqueta em maiuscula, e nao a serifada grande que
                    os outros feeds usam para nomear a reflexao. */}
                <Overline color={scheme.accent}>{nota.reflection_verse}</Overline>

                <Text variant="body" style={{ marginTop: space.md }} numberOfLines={4}>
                  {nota.note}
                </Text>

                <GoldRule align="left" width={28} style={{ marginTop: space.lg }} />

                <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.md }}>
                  {formatRelativePT(nota.createdAt)}
                </Text>
              </View>

              <Pressable
                onPress={() => apagar(nota)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Apagar anotação"
              >
                {({ pressed }) => (
                  <View style={{ opacity: pressed ? 0.4 : 1 }}>
                    <Ionicons name="trash-outline" size={17} color={scheme.textGhost} />
                  </View>
                )}
              </Pressable>
            </View>
          </TouchableCard>
        )}
      />
    </View>
  );
}
