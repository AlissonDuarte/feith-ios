import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, EmptyState, Loading, Overline, Text } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { SHARE_CARD_TEMPLATES, ShareCard, type ShareCardTemplate } from '../../src/share/ShareCard';
import { trechoDe } from '../../src/share/trecho';
import { useShareCardExport } from '../../src/share/useShareCardExport';
import { useTheme } from '../../src/theme/ThemeContext';
import { radius, space } from '../../src/theme/tokens';

export default function CompartilharCartao() {
  const { scheme } = useTheme();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { summary } = useAuth();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [template, setTemplate] = useState<ShareCardTemplate>('oxblood');

  const { ref, processando, erro: erroExport, salvo, compartilhar, salvar } = useShareCardExport();

  const carregar = useCallback(async () => {
    if (!key) return;
    setErro(null);
    try {
      setReflexao(await api.getReflection(key));
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [key]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (erro || !reflexao) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível abrir"
          descricao={erro ?? undefined}
          acao={<Button label="Tentar de novo" onPress={() => void carregar()} />}
        />
      </SafeAreaView>
    );
  }

  const quote = trechoDe(reflexao.bible_text, 140);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Compartilhar' }} />
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, alignItems: 'center', paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        <ViewShot ref={ref} options={{ format: 'png', quality: 1 }}>
          <ShareCard
            template={template}
            scriptureReference={reflexao.scripture_reference}
            quote={quote}
            streakDays={summary && summary.streak > 0 ? summary.streak : undefined}
          />
        </ViewShot>

        <View style={{ width: '100%' }}>
          <Overline style={{ textAlign: 'center' }}>Modelo do cartão</Overline>
          <View style={{ flexDirection: 'row', gap: space.md, justifyContent: 'center', marginTop: space.md }}>
            {SHARE_CARD_TEMPLATES.map((t) => {
              const ativo = t.valor === template;
              return (
                <Button
                  key={t.valor}
                  label={t.rotulo}
                  variant={ativo ? 'secondary' : 'ghost'}
                  size="sm"
                  onPress={() => setTemplate(t.valor)}
                />
              );
            })}
          </View>
        </View>

        {erroExport ? (
          <Text variant="caption" color={scheme.accent}>
            {erroExport}
          </Text>
        ) : null}
        {salvo ? (
          <Text variant="caption" color={scheme.textMuted}>
            Salvo nas suas fotos.
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: space.md, width: '100%' }}>
          <Button
            label="Salvar imagem"
            variant="secondary"
            style={{ flex: 1, borderRadius: radius.sm }}
            loading={processando === 'salvar'}
            disabled={processando !== null}
            onPress={() => {
              void salvar();
              posthog?.capture('reflection_card_saved', { template });
            }}
          />
          <Button
            label="Compartilhar"
            style={{ flex: 1, borderRadius: radius.sm }}
            loading={processando === 'compartilhar'}
            disabled={processando !== null}
            onPress={() => {
              void compartilhar();
              posthog?.capture('reflection_card_shared', { template });
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
