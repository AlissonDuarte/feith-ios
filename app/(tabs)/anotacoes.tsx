import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import { mensagemDe } from '../../src/api/errors';
import type { NoteItem } from '../../src/api/types';
import { FeedList } from '../../src/components/FeedList';
import { Card, Text, scheme } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthContext';
import { useListaPaginada } from '../../src/hooks/useListaPaginada';

export default function Anotacoes() {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        <Text variant="display" display weight="bold">
          Anotações
        </Text>
      </View>

      <FeedList
        lista={lista}
        chave={(n) => n.note_uuid}
        placeholderBusca="Buscar nas anotações"
        tituloVazio="Nenhuma anotação ainda"
        descricaoVazia="Ao ler uma reflexão, toque no botão de escrever para guardar o que ela te disse."
        renderItem={(nota) => (
          <Pressable
            onPress={() => router.push(`/leitura/${nota.reflection_uuid}`)}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="semi" color={scheme.accent}>
                    {nota.reflection_verse}
                  </Text>
                  <Text variant="body" style={{ marginTop: 8 }} numberOfLines={4}>
                    {nota.note}
                  </Text>
                  <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 10 }}>
                    {formatRelativePT(nota.createdAt)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => apagar(nota)}
                  hitSlop={12}
                  accessibilityLabel="Apagar anotação"
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, paddingLeft: 12 }]}
                >
                  <Ionicons name="trash-outline" size={20} color={scheme.textMuted} />
                </Pressable>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
