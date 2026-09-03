import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection, ReflectionNote } from '../../src/api/types';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { NotaSheet } from '../../src/components/NotaSheet';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import { Button, Card, EmptyState, Text, scheme } from '../../src/components/ui';
import { formatRelativePT } from '../../src/api/dates';

/**
 * Leitura de uma reflexao por uuid.
 *
 * E o equivalente do GeneralReader.svelte: uma tela so, aberta a partir dos
 * tres feeds (anotacoes, favoritos, historico), em vez de tres rotas [key]
 * duplicando o mesmo componente.
 */
export default function Leitura() {
  const { key } = useLocalSearchParams<{ key: string }>();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [notas, setNotas] = useState<ReflectionNote[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [escrevendo, setEscrevendo] = useState(false);

  const carregarNotas = useCallback(async () => {
    if (!key) return;
    try {
      const page = await api.getReflectionNotes(key, { page: 1, page_size: 50 });
      setNotas(page.items);
    } catch {
      // As anotacoes sao acessorias: falhar aqui nao pode impedir a leitura.
    }
  }, [key]);

  const carregar = useCallback(async () => {
    if (!key) return;
    setErro(null);
    try {
      setReflexao(await api.getReflection(key));
      await carregarNotas();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [key, carregarNotas]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  async function compartilhar() {
    if (!reflexao) return;
    try {
      const link = await api.createShareLink(reflexao.uuid);
      // Share sheet nativo: um toque para WhatsApp, que e como
      // compartilhamento acontece no Brasil. A web tem um modal com campo
      // read-only e botao de copiar.
      await Share.share({
        message: `${reflexao.scripture_reference} — ${link.url}`,
        url: link.url,
      });
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={scheme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (erro || !reflexao) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          titulo="Não foi possível abrir"
          descricao={erro ?? undefined}
          acao={<Button label="Tentar de novo" onPress={() => void carregar()} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <Stack.Screen
        options={{
          title: reflexao.scripture_reference,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <BotaoFavorito
                reflectionUuid={reflexao.uuid}
                favoritado={reflexao.bookmarked}
                onMudou={(v) => setReflexao((r) => (r ? { ...r, bookmarked: v } : r))}
                tamanho={22}
              />
              <Pressable onPress={compartilhar} hitSlop={12} accessibilityLabel="Compartilhar">
                <Ionicons name="share-outline" size={22} color={scheme.textSecondary} />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 96 }}>
        <ReflexaoReader reflexao={reflexao} />

        {notas.length > 0 ? (
          <View style={{ marginTop: 40 }}>
            <Text variant="title" display weight="bold">
              Suas anotações
            </Text>
            {notas.map((n) => (
              <Card key={n.note_uuid} style={{ marginTop: 12 }}>
                <Text variant="body">{n.note}</Text>
                <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 8 }}>
                  {formatRelativePT(n.createdAt)}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Botao fixo, e nao o FAB arrastavel da web: arrastar briga com o gesto
          de voltar do iOS e com o scroll. */}
      <View style={{ position: 'absolute', right: 24, bottom: 32 }}>
        <Pressable
          onPress={() => setEscrevendo(true)}
          accessibilityRole="button"
          accessibilityLabel="Escrever anotação"
          style={({ pressed }) => [
            {
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: scheme.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="create-outline" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      <NotaSheet
        visivel={escrevendo}
        reflectionUuid={reflexao.uuid}
        onFechar={() => setEscrevendo(false)}
        onSalvou={() => {
          setEscrevendo(false);
          void carregarNotas();
        }}
      />
    </View>
  );
}
