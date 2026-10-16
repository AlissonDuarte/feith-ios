import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { FeedbackCategoria } from '../../src/api/types';
import { Button, Field, Overline, Text } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { useTheme } from '../../src/theme/ThemeContext';
import { radius, space, type Scheme } from '../../src/theme/tokens';

const LIMITE = 2000;

const MOTIVOS: {
  valor: FeedbackCategoria;
  rotulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  dica: string;
}[] = [
  { valor: 'sugestao', rotulo: 'Sugestão', icone: 'bulb-outline', dica: 'O que faria o feith ficar melhor pra você?' },
  { valor: 'dica', rotulo: 'Dica', icone: 'sparkles-outline', dica: 'Manda sua dica, a gente lê todas.' },
  { valor: 'elogio', rotulo: 'Elogio', icone: 'heart-outline', dica: 'Do que você mais gosta no app?' },
  { valor: 'critica', rotulo: 'Crítica', icone: 'chatbubble-ellipses-outline', dica: 'Pode falar sem rodeio, é assim que a gente melhora.' },
  { valor: 'reclamacao', rotulo: 'Reclamação', icone: 'alert-circle-outline', dica: 'Conta o que aconteceu e a gente resolve.' },
  { valor: 'erro', rotulo: 'Algo deu errado', icone: 'bug-outline', dica: 'O que você estava fazendo quando deu o problema?' },
];

export default function ContaPraGente() {
  const { scheme } = useTheme();
  const router = useRouter();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);

  const [motivo, setMotivo] = useState<FeedbackCategoria | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selecionado = MOTIVOS.find((m) => m.valor === motivo);
  const podeEnviar = Boolean(motivo) && texto.trim().length >= 3 && !enviando;

  function escolher(valor: FeedbackCategoria) {
    setMotivo(valor);
    setErro(null);
    posthog?.capture('feedback_category_selected', { category: valor });
  }

  async function enviar() {
    if (!motivo || !podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.sendFeedback({
        category: motivo,
        message: texto.trim(),
        app_version: Constants.expoConfig?.version ?? null,
        platform: Platform.OS === 'android' ? 'android' : 'ios',
      });
      setEnviado(true);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
        <View style={estilos.obrigado}>
          <Ionicons name="checkmark-circle-outline" size={48} color={scheme.gold} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Valeu demais!
          </Text>
          <Text variant="body" color={scheme.textSecondary} style={{ textAlign: 'center' }}>
            Sua mensagem chegou pra gente. Cada uma é lida com carinho.
          </Text>
          <Button label="Voltar ao perfil" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.section }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body" color={scheme.textSecondary}>
          Fala com a gente! Sugestão, dica, elogio ou bronca: tudo ajuda o feith a ficar melhor.
        </Text>

        <View>
          <Overline style={{ marginBottom: space.md }}>Sobre o quê?</Overline>
          <View style={estilos.motivos}>
            {MOTIVOS.map((m) => {
              const ativo = m.valor === motivo;
              return (
                <Pressable
                  key={m.valor}
                  onPress={() => escolher(m.valor)}
                  disabled={enviando}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={m.rotulo}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        estilos.motivo,
                        ativo && { borderColor: scheme.accent, backgroundColor: scheme.canvasWarm },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name={m.icone} size={16} color={ativo ? scheme.accent : scheme.textSecondary} />
                      <Text
                        variant="bodySm"
                        font={ativo ? 'bodySemi' : 'bodyMedium'}
                        color={ativo ? scheme.accent : scheme.textPrimary}
                      >
                        {m.rotulo}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {selecionado ? (
          <Field
            label="Sua mensagem"
            value={texto}
            onChangeText={(t) => setTexto(t.slice(0, LIMITE))}
            placeholder={selecionado.dica}
            multiline
            textAlignVertical="top"
            maxLength={LIMITE}
            editable={!enviando}
            style={{ minHeight: 160 }}
            erro={erro}
            ajuda={`${texto.length}/${LIMITE}`}
          />
        ) : null}

        {selecionado ? (
          <Button label="Enviar" onPress={enviar} loading={enviando} disabled={!podeEnviar} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    motivos: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    motivo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    obrigado: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.lg,
      padding: space.gutter,
    },
  });
}
