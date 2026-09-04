import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { ApiError, type SharedReflection } from '../../src/api/types';
import { AccentHalo } from '../../src/components/ornaments';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import { Button, EmptyState, GoldRule, Loading, Overline, Text, scheme } from '../../src/components/ui';
import { useAuth } from '../../src/auth/AuthContext';
import { space } from '../../src/theme/tokens';

/**
 * Reflexao compartilhada por link curto.
 *
 * Rota PUBLICA — fica fora do guard de app/_layout.tsx de proposito: alguem
 * recebe o link no WhatsApp e abre sem ter conta. Mandar essa pessoa para o
 * login seria jogar fora o unico canal de aquisicao organico do produto.
 *
 * Chega por Universal Link (https://feith.space/r/<token>) quando o app esta
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
        <Loading />
      </SafeAreaView>
    );
  }

  if (falha || !reflexao) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          icone="link-outline"
          titulo={falha?.titulo ?? 'Não foi possível abrir'}
          descricao={falha?.descricao}
          acao={
            <Button
              label={sessao ? 'Ir para a reflexão de hoje' : 'Conhecer o feith'}
              icon="arrow-forward"
              onPress={() => router.replace(sessao ? '/(tabs)/hoje' : '/(auth)/login')}
            />
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <AccentHalo height={360} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        <ReflexaoReader reflexao={reflexao} />

        {/* Quem chegou pelo link e nao tem conta: conversao sem paywall.
            Nenhuma mencao a preco — no iOS isso e territorio do StoreKit.
            Bloco em pergaminho e nao card branco: e um convite ao fim de uma
            leitura, nao um banner. */}
        {!sessao ? (
          <View style={{ marginTop: space.sm, alignItems: 'center' }}>
            <GoldRule width="100%" />
            <View
              style={{
                backgroundColor: scheme.canvasWarm,
                alignSelf: 'stretch',
                alignItems: 'center',
                paddingHorizontal: space.xl,
                paddingVertical: space.xxl,
              }}
            >
              <Overline color={scheme.accent}>Exegese diária</Overline>
              <Text variant="title" style={{ textAlign: 'center', marginTop: space.md }}>
                Uma leitura assim, todo dia
              </Text>
              <Text
                variant="bodySm"
                color={scheme.textSecondary}
                style={{ textAlign: 'center', marginTop: space.md, maxWidth: 300 }}
              >
                Contexto histórico, análise nas línguas originais e aplicação — sem
                simplificações.
              </Text>
              <Button
                label="Criar uma conta"
                icon="arrow-forward"
                onPress={() => router.push('/(auth)/register')}
                style={{ marginTop: space.xl, alignSelf: 'stretch' }}
              />
            </View>
            <GoldRule width="100%" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
