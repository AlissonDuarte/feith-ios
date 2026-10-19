/**
 * Comentarios na reflexao do dia (moderados: termos bloqueados na criacao e
 * denuncia da comunidade, que oculta apos 3 reportes — ver comment_service.py
 * no backend). Secao inline na tela de leitura, sem rota propria: a lista e
 * curta e nao justifica uma tela separada.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { api } from '../api/client';
import { mensagemDe } from '../api/errors';
import type { CommentItem } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, space } from '../theme/tokens';
import { Button, Hairline, Overline, Text } from './ui';

interface Props {
  reflectionUuid: string;
  total: number;
  onTotalChange?: (total: number) => void;
}

export function ComentariosSecao({ reflectionUuid, total, onTotalChange }: Props) {
  const { scheme } = useTheme();
  const [comentarios, setComentarios] = useState<CommentItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!reflectionUuid) return;
    try {
      const pagina = await api.getComments(reflectionUuid, { page_size: 50 });
      setComentarios(pagina.items);
      onTotalChange?.(pagina.total);
    } catch {
      // Secao secundaria da tela de leitura: um erro aqui nao pode travar a
      // reflexao em volta. A pessoa so nao ve comentarios desta vez.
    } finally {
      setCarregando(false);
    }
  }, [reflectionUuid, onTotalChange]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await api.createComment(reflectionUuid, conteudo);
      setTexto('');
      await carregar();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setEnviando(false);
    }
  }

  function apagar(comentario: CommentItem) {
    Alert.alert('Apagar comentário?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          api
            .deleteComment(comentario.comment_uuid)
            .then(carregar)
            .catch((e) => Alert.alert('Não foi possível apagar', mensagemDe(e)));
        },
      },
    ]);
  }

  function denunciar(comentario: CommentItem) {
    Alert.alert('Denunciar comentário?', 'Vamos avisar a moderação sobre este conteúdo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Denunciar',
        style: 'destructive',
        onPress: () => {
          api
            .reportComment(comentario.comment_uuid)
            .then(() => Alert.alert('Obrigado', 'Vamos analisar este comentário.'))
            .catch((e) => Alert.alert('Não foi possível denunciar', mensagemDe(e)));
        },
      },
    ]);
  }

  return (
    <View style={{ marginTop: space.xxl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.md }}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color={scheme.textSecondary} />
        <Overline color={scheme.textSecondary}>
          {total > 0 ? `Comentários · ${total}` : 'Comentários'}
        </Overline>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Compartilhe um insight sobre esta reflexão..."
          placeholderTextColor={scheme.textGhost}
          multiline
          editable={!enviando}
          maxLength={500}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: scheme.border,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: 10,
            fontFamily: fonts.body,
            fontSize: 15,
            color: scheme.textPrimary,
          }}
        />
        <Button
          label="Enviar"
          variant="secondary"
          size="sm"
          loading={enviando}
          disabled={!texto.trim() || enviando}
          onPress={enviar}
          style={{ width: 90 }}
        />
      </View>

      {erro ? (
        <Text variant="caption" color={scheme.accent} style={{ marginTop: 6 }}>
          {erro}
        </Text>
      ) : null}

      <View style={{ marginTop: space.lg }}>
        {carregando ? (
          <Text variant="caption" color={scheme.textGhost}>
            Carregando comentários...
          </Text>
        ) : comentarios.length === 0 ? (
          <Text variant="caption" color={scheme.textGhost}>
            Seja a primeira pessoa a comentar esta reflexão.
          </Text>
        ) : (
          comentarios.map((c, i) => (
            <View key={c.comment_uuid}>
              <View style={{ paddingVertical: space.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Text variant="bodySm" font="bodySemi" color={scheme.textPrimary}>
                    {c.author}
                  </Text>
                  <Pressable
                    onPress={() => (c.is_own ? apagar(c) : denunciar(c))}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={c.is_own ? 'Apagar comentário' : 'Denunciar comentário'}
                  >
                    <Ionicons
                      name={c.is_own ? 'trash-outline' : 'flag-outline'}
                      size={14}
                      color={scheme.textGhost}
                    />
                  </Pressable>
                </View>
                <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: 2 }}>
                  {c.content}
                </Text>
                <Text variant="micro" color={scheme.textGhost} style={{ marginTop: 4 }}>
                  {c.created_at}
                </Text>
              </View>
              {i < comentarios.length - 1 ? <Hairline /> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
