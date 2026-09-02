import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { ApiError, type SharedReflection } from '../../src/api/types';
import { Button, EmptyState, Text, scheme } from '../../src/components/ui';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import { useAuth } from '../../src/auth/AuthContext';

/**
 * Reflexao compartilhada por link curto.
 *
 * Rota PUBLICA — fica fora do guard de app/_layout.tsx de proposito: alguem
 * recebe o link no WhatsApp e abre sem ter conta. Mandar essa pessoa para o
 * login seria jogar fora o unico canal de aquisicao organico do produto.
 *
 * Chega por Universal Link (https://fidio.online/r/<token>) quando o app esta
 * instalado, e pela pagina web quando nao esta.
 */
export default function LinkCompartilhado() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { token: sessao } = useAuth();
  const router = useRouter();

  const [reflexao, setReflexao] = useState<SharedReflection | null>(null);
  const [falha, setFalha] = useState<{ titulo: string; descricao: string } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!token) return;

    api
      .getSharedReflection(token)
      .then(setReflexao)
      .catch((e: unknown) => {
        // Os tres estados terminais do backend, cada um com significado
        // proprio (shared_link_service.py). A web ja os distingue e o app
        // precisa fazer o mesmo: um 429 aqui nao e "erro", e o limite de 3
        // leituras do link, que e regra de produto.
        const status = e instanceof ApiError ? e.status : 0;
        if (status === 410) {
          setFalha({
            titulo: 'Este link expirou',
            descricao: 'Links compartilhados valem por 12 horas.',
          });
        } else if (status === 429) {
          setFalha({
            titulo: 'Limite de leituras atingido',
            descricao: 'Cada link pode ser aberto até 3 vezes. Peça um novo a quem compartilhou.',
          });
        } else if (status === 404) {
          setFalha({ titulo: 'Link não encontrado', descricao: 'Confira se o endereço está completo.' });
        } else {
          setFalha({
            titulo: 'Não foi possível abrir',
            descricao: 'Verifique sua conexão e tente de novo.',
          });
        }
      })
      .finally(() => setCarregando(false));
  }, [token]);

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={scheme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (falha || !reflexao) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          titulo={falha?.titulo ?? 'Não foi possível abrir'}
          descricao={falha?.descricao}
          acao={
            <Button
              label={sessao ? 'Ir para a reflexão de hoje' : 'Conhecer o fidio'}
              onPress={() => router.replace(sessao ? '/(tabs)/hoje' : '/(auth)/login')}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64 }}>
        <ReflexaoReader reflexao={reflexao} />

        {/* Quem chegou pelo link e nao tem conta: conversao sem paywall.
            Nenhuma mencao a preco — no iOS isso e territorio do StoreKit. */}
        {!sessao ? (
          <View style={{ marginTop: 40, gap: 12 }}>
            <Text variant="body" color={scheme.textSecondary}>
              Uma exegese nova todo dia, com contexto histórico, análise no original e aplicação.
            </Text>
            <Button label="Criar uma conta" onPress={() => router.push('/(auth)/register')} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
