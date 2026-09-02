import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection, Streak } from '../../src/api/types';
import { Button, EmptyState, Text, scheme } from '../../src/components/ui';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';

export default function Hoje() {
  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const daily = await api.getDailyReflection();
      setReflexao(daily);

      // Este GET tem efeito colateral: ele registra a leitura de hoje
      // (reflection_views.py:37), que e o que alimenta o streak. Buscar o
      // streak ANTES dele mostraria o numero de ontem.
      setStreak(await api.getStreak());
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, []);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

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
      {streak && streak.streak > 0 ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text variant="caption" weight="semi" color={scheme.accent}>
            {streak.streak} {streak.streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
        </View>
      ) : null}

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
    </SafeAreaView>
  );
}
