/**
 * Botao de favoritar uma reflexao.
 *
 * Duas coisas que a web nao faz:
 *
 * 1. Update otimista com rollback. A estrela vira na hora e volta se o
 *    servidor recusar — sem isso, favoritar tem a latencia da rede.
 * 2. O 429 do plano gratuito vira explicacao, nao erro. Ele nao significa "deu
 *    errado": significa que a pessoa chegou ao limite, e o backend informa qual
 *    e o limite (via summary), entao da para dizer o numero.
 *
 * Atencao a semantica do backend: GET /reflections/bookmark ALTERNA e DELETE
 * REMOVE — mesmo caminho, comportamentos diferentes. Por isso as duas chamadas
 * sao explicitas aqui.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { api } from '../api/client';
import { ehLimiteDePlano, mensagemDe } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { scheme } from './ui';

interface Props {
  reflectionUuid: string;
  favoritado: boolean;
  onMudou: (favoritado: boolean) => void;
  tamanho?: number;
}

export function BotaoFavorito({ reflectionUuid, favoritado, onMudou, tamanho = 24 }: Props) {
  const { summary, refreshSummary } = useAuth();
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    if (ocupado) return;
    setOcupado(true);

    const anterior = favoritado;
    onMudou(!anterior);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (anterior) {
        await api.removeBookmark(reflectionUuid);
      } else {
        await api.toggleBookmark(reflectionUuid);
      }
      // O contador de quota vive no summary; sem isto a tela de perfil ficaria
      // mostrando um numero velho.
      void refreshSummary();
    } catch (e) {
      onMudou(anterior);

      if (ehLimiteDePlano(e)) {
        const limite = summary?.quotas.bookmarks_limit;
        Alert.alert(
          'Limite de favoritos',
          limite
            ? `O plano gratuito guarda até ${limite} favoritos. Apoiadores não têm limite.`
            : 'O plano gratuito tem um limite de favoritos. Apoiadores não têm limite.',
        );
      } else {
        Alert.alert('Não foi possível salvar', mensagemDe(e));
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Pressable
      onPress={alternar}
      disabled={ocupado}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      accessibilityState={{ selected: favoritado, disabled: ocupado }}
      style={({ pressed }) => [{ opacity: pressed || ocupado ? 0.5 : 1 }]}
    >
      <Ionicons
        name={favoritado ? 'star' : 'star-outline'}
        size={tamanho}
        color={favoritado ? scheme.accent : scheme.textMuted}
      />
    </Pressable>
  );
}
