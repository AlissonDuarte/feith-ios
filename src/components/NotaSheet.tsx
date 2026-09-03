/**
 * Composicao de anotacao.
 *
 * Porte de modal/WriteNote.svelte, com tres correcoes:
 *
 * 1. `alert()` do minimo de palavras vira texto de ajuda inline. Um alerta
 *    modal para validacao de campo interrompe sem necessidade.
 * 2. `confirm()` ao descartar vira Alert.alert nativo, e so aparece quando ha
 *    rascunho de verdade.
 * 3. O teclado nao cobre mais o campo (KeyboardAvoidingView).
 *
 * Usa Modal do proprio RN em vez de uma biblioteca de bottom sheet: com
 * `presentationStyle="pageSheet"` o iOS ja entrega a folha nativa, com o gesto
 * de arrastar para fechar incluido, e sem mais uma dependencia nativa.
 */
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { ehLimiteDePlano, mensagemDe } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { radius } from '../theme/tokens';
import { Button, Text, scheme } from './ui';

/** Mesmo minimo da web (WriteNote.svelte): tres palavras. */
const MINIMO_PALAVRAS = 3;

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

interface Props {
  visivel: boolean;
  reflectionUuid: string;
  onFechar: () => void;
  onSalvou: () => void;
}

export function NotaSheet({ visivel, reflectionUuid, onFechar, onSalvou }: Props) {
  const { summary, refreshSummary } = useAuth();
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const palavras = contarPalavras(texto);
  const curtaDemais = palavras > 0 && palavras < MINIMO_PALAVRAS;
  const podeSalvar = palavras >= MINIMO_PALAVRAS && !salvando;

  function fechar() {
    setTexto('');
    onFechar();
  }

  function tentarFechar() {
    if (texto.trim().length === 0) return fechar();

    Alert.alert('Descartar anotação?', 'O que você escreveu será perdido.', [
      { text: 'Continuar escrevendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: fechar },
    ]);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await api.createNote(reflectionUuid, texto.trim());
      void refreshSummary();
      setTexto('');
      onSalvou();
    } catch (e) {
      if (ehLimiteDePlano(e)) {
        const limite = summary?.quotas.notes_limit;
        // A sheet FICA ABERTA: perder o texto escrito por causa de um limite
        // seria punir duas vezes.
        Alert.alert(
          'Limite de anotações',
          limite
            ? `O plano gratuito permite ${limite} anotações por mês. Apoiadores não têm limite.`
            : 'Você atingiu o limite de anotações do plano gratuito.',
        );
      } else {
        Alert.alert('Não foi possível salvar', mensagemDe(e));
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={tentarFechar}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, padding: 24 }}>
            <Text variant="title" display weight="bold">
              Nova anotação
            </Text>

            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="O que esta reflexão te disse?"
              placeholderTextColor={scheme.textMuted}
              multiline
              autoFocus
              textAlignVertical="top"
              editable={!salvando}
              style={{
                flex: 1,
                marginTop: 16,
                padding: 16,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: scheme.border,
                backgroundColor: scheme.surface,
                fontFamily: 'Inter_400Regular',
                fontSize: 17,
                lineHeight: 26,
                color: scheme.textPrimary,
              }}
            />

            {curtaDemais ? (
              <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 8 }}>
                Escreva ao menos {MINIMO_PALAVRAS} palavras.
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={tentarFechar}
                disabled={salvando}
                style={{ flex: 1 }}
              />
              <Button
                label="Salvar"
                onPress={salvar}
                loading={salvando}
                disabled={!podeSalvar}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
