import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { NotaSheet } from '../../src/components/NotaSheet';
import { Button, EmptyState, Text, scheme } from '../../src/components/ui';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';

export default function Hoje() {
  // O streak vem do summary do AuthContext, que ja e compartilhado por todas
  // as telas — buscar /streaks/me aqui seria a mesma duplicacao que a web faz.
  const { summary, refreshSummary } = useAuth();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const daily = await api.getDailyReflection();
      setReflexao(daily);

      // Este GET tem efeito colateral: ele registra a leitura de hoje
      // (reflection_views.py:37), que e o que alimenta o streak. Recarregar o
      // summary DEPOIS dele — e nunca antes — e o que faz o contador subir no
      // mesmo instante em que a pessoa abre a reflexao.
      await refreshSummary();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [refreshSummary]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  const compartilhar = useCallback(async () => {
    if (!reflexao?.uuid) return;
    try {
      const link = await api.createShareLink(reflexao.uuid);
      // Share sheet nativo — um toque para o WhatsApp. A web tem um modal com
      // campo read-only e botao de copiar.
      await Share.share({
        message: `${reflexao.scripture_reference} — ${link.url}`,
        url: link.url,
      });
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [reflexao]);

  const puxarParaAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={scheme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          titulo="Não foi possível carregar"
          descricao={erro}
          acao={<Button label="Tentar de novo" onPress={puxarParaAtualizar} />}
        />
      </SafeAreaView>
    );
  }

  // Quando nao ha reflexao publicada, o backend NAO devolve 404: ele devolve
  // todos os campos em branco com uuid vazio (reflection_service.py:39-51).
  // Sem este ramo, a tela renderizaria cards vazios e pareceria quebrada — que
  // e exatamente o que um revisor da App Store veria num dia sem conteudo.
  if (!reflexao || !reflexao.uuid) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          titulo="A reflexão de hoje ainda não saiu"
          descricao="Assim que ela for publicada, você a encontra aqui. Enquanto isso, seu histórico continua disponível."
          acao={<Button label="Atualizar" variant="secondary" onPress={puxarParaAtualizar} />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      {/* O badge de streak vem do Sidebar da web (Sidebar.svelte:264-284).
          Numa tab bar nao ha onde poe-lo, e a header da Hoje e melhor lugar:
          e a primeira coisa que a pessoa ve ao abrir o app. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 8,
        }}
      >
        {/* O badge de streak vem do Sidebar da web (Sidebar.svelte:264-284).
            Numa tab bar nao ha onde poe-lo, e a header da Hoje e melhor lugar:
            e a primeira coisa que a pessoa ve ao abrir o app. */}
        {summary && summary.streak > 0 ? (
          <Text variant="caption" weight="semi" color={scheme.accent}>
            {summary.streak} {summary.streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
        ) : (
          <View />
        )}

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
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={puxarParaAtualizar}
            tintColor={scheme.accent}
          />
        }
      >
        <ReflexaoReader reflexao={reflexao} />
      </ScrollView>

      {/* Botao fixo, e nao o FAB arrastavel da web (Note.svelte): arrastar
          briga com o gesto de voltar do iOS e com o scroll. */}
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
        onSalvou={() => setEscrevendo(false)}
      />
    </SafeAreaView>
  );
}
