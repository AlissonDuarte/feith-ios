import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT } from '../../src/api/dates';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection, ReflectionNote } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { NotaSheet } from '../../src/components/NotaSheet';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import {
  Button,
  Card,
  EmptyState,
  GoldRule,
  IconButton,
  Loading,
  Overline,
  Text,
  scheme,
} from '../../src/components/ui';
import { PlayerAudio } from '../../src/player/PlayerAudio';
import { radius, shadow, space } from '../../src/theme/tokens';

/**
 * Leitura de uma reflexao por uuid.
 *
 * E o equivalente do GeneralReader.svelte: uma tela so, aberta a partir dos
 * tres feeds (anotacoes, favoritos, historico), em vez de tres rotas [key]
 * duplicando o mesmo componente.
 */
export default function Leitura() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { isSupporter } = useAuth();

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
      <SafeAreaView style={estilos.tela}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (erro || !reflexao) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível abrir"
          descricao={erro ?? undefined}
          acao={<Button label="Tentar de novo" onPress={() => void carregar()} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={estilos.tela}>
      <Stack.Screen
        options={{
          // A barra de navegacao ja carrega a referencia; o leitor a repete em
          // serifada grande logo abaixo, e e assim que deve ser: o titulo da
          // barra e para quem esta a meio da rolagem.
          title: reflexao.scripture_reference,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <BotaoFavorito
                reflectionUuid={reflexao.uuid}
                favoritado={reflexao.bookmarked}
                onMudou={(v) => setReflexao((r) => (r ? { ...r, bookmarked: v } : r))}
                tamanho={19}
              />
              <IconButton
                name="share-outline"
                label="Compartilhar"
                onPress={compartilhar}
                size={18}
              />
            </View>
          ),
        }}
      />

      <ScrollView
        // 112 cobria so o FAB. Com o player empilhado acima dele, as anotacoes
        // do fim da tela ficariam encobertas.
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingBottom: isSupporter ? 112 + 46 + space.md : 112,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ReflexaoReader reflexao={reflexao} />

        {notas.length > 0 ? (
          <View style={{ marginTop: space.sm }}>
            <Overline>Suas anotações</Overline>
            <GoldRule align="left" width={40} style={{ marginTop: space.md }} />

            {notas.map((n) => (
              <Card key={n.note_uuid} style={{ marginTop: space.lg }}>
                <Text variant="body">{n.note}</Text>
                <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.md }}>
                  {formatRelativePT(n.createdAt)}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Botao fixo, e nao o FAB arrastavel da web: arrastar briga com o gesto
          de voltar do iOS e com o scroll. */}
      <View style={estilos.ancora} pointerEvents="box-none">
        {/* Mesma montagem da aba Hoje: o audio do acervo vale tanto quanto o do
            dia para quem apoia. */}
        {isSupporter ? (
          <PlayerAudio
            reflectionUuid={reflexao.uuid}
            referencia={reflexao.scripture_reference}
          />
        ) : null}

        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setEscrevendo(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Escrever anotação"
          style={({ pressed }) => [
            estilos.fab,
            { backgroundColor: pressed ? scheme.accentPressed : scheme.accent },
          ]}
        >
          <Ionicons name="create-outline" size={17} color={scheme.onAccent} />
          <Text variant="micro" font="bodySemi" color={scheme.onAccent} style={{ letterSpacing: 2 }}>
            ANOTAR
          </Text>
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

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: scheme.canvas },
  ancora: {
    position: 'absolute',
    right: space.gutter,
    bottom: 36,
    // Player e ANOTAR empilhados, alinhados a direita.
    alignItems: 'flex-end',
    gap: space.md,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.sharp,
    ...shadow.raised,
  },
});
