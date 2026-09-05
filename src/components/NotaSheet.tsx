/**
 * Composicao de anotacao.
 *
 * Porte de modal/WriteNote.svelte, com tres correcoes:
 *
 * 1. `alert()` do minimo de palavras vira contador inline. Um alerta modal
 *    para validacao de campo interrompe sem necessidade.
 * 2. `confirm()` ao descartar vira Alert.alert nativo, e so aparece quando ha
 *    rascunho de verdade.
 * 3. O teclado nao cobre mais o campo (KeyboardAvoidingView).
 *
 * Usa Modal do proprio RN em vez de uma biblioteca de bottom sheet: com
 * `presentationStyle="pageSheet"` o iOS ja entrega a folha nativa, com o gesto
 * de arrastar para fechar incluido, e sem mais uma dependencia nativa.
 */
import { useEffect, useState } from 'react';
import { Alert, Keyboard, Modal, Platform, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { ehLimiteDePlano, mensagemDe } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { fonts, space } from '../theme/tokens';
import { Button, GoldRule, Overline, Text, scheme } from './ui';

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
  const insets = useSafeAreaInsets();
  const { summary, refreshSummary } = useAuth();
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setAlturaTeclado(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setAlturaTeclado(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      <SafeAreaView
        style={{ flex: 1, backgroundColor: scheme.canvas }}
        edges={['top', 'left', 'right']}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: space.gutter,
            paddingTop: space.xl,
            paddingBottom:
              alturaTeclado > 0 ? alturaTeclado + space.sm : Math.max(space.lg, insets.bottom),
          }}
        >
          <Overline>Seu caderno</Overline>
          <Text variant="display" style={{ marginTop: 6 }}>
            Nova anotação
          </Text>
          <GoldRule align="left" width={48} style={{ marginTop: space.md }} />

          {/* Sem moldura: a folha inteira e o papel. Uma caixa com borda
              dentro de uma folha ja branca so desenha uma caixa. */}
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="O que esta reflexão te disse?"
            placeholderTextColor={scheme.textGhost}
            multiline
            autoFocus
            textAlignVertical="top"
            editable={!salvando}
            style={{
              flex: 1,
              marginTop: space.xl,
              paddingVertical: space.md,
              fontFamily: fonts.body,
              fontSize: 17,
              lineHeight: 28,
              color: scheme.textPrimary,
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: space.md,
              borderTopWidth: 1,
              borderTopColor: scheme.borderSoft,
            }}
          >
            <Text
              variant="micro"
              color={curtaDemais ? scheme.accent : scheme.textGhost}
            >
              {curtaDemais
                ? `Escreva ao menos ${MINIMO_PALAVRAS} palavras`
                : palavras > 0
                  ? `${palavras} ${palavras === 1 ? 'palavra' : 'palavras'}`
                  : ''}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button
              label="Cancelar"
              variant="quiet"
              onPress={tentarFechar}
              disabled={salvando}
              style={{ flex: 1 }}
            />
            <Button
              label="Salvar"
              variant="quiet"
              onPress={salvar}
              loading={salvando}
              disabled={!podeSalvar}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
