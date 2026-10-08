import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { api } from '../api/client';
import { posthog } from '../config/posthog';
import { situacaoDaVersao, type SituacaoVersao } from './versao';

const DISPENSADA_KEY = 'feith.update.dispensada';

const VERSAO_ATUAL = Constants.expoConfig?.version;

export interface Atualizacao {
  situacao: SituacaoVersao;
  storeUrl: string | null;
}

export function abrirLoja(storeUrl: string | null) {
  if (storeUrl) void Linking.openURL(storeUrl);
}

export function useAtualizacao(): Atualizacao {
  const [estado, setEstado] = useState<Atualizacao>({ situacao: 'em_dia', storeUrl: null });
  const alertaAberto = useRef(false);

  const checar = useCallback(async () => {
    if (!VERSAO_ATUAL || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
    try {
      const politica = (await api.getAppVersionPolicy())[Platform.OS];
      const situacao = situacaoDaVersao(VERSAO_ATUAL, politica);
      setEstado({ situacao, storeUrl: politica.store_url });

      if (situacao === 'obrigatoria') {
        posthog?.capture('update_required_shown', {
          current_version: VERSAO_ATUAL,
          min_version: politica.min_version,
        });
        return;
      }
      if (situacao !== 'recomendada' || alertaAberto.current) return;

      const dispensada = await AsyncStorage.getItem(DISPENSADA_KEY);
      if (dispensada === politica.latest_version) return;

      alertaAberto.current = true;
      posthog?.capture('update_prompt_shown', {
        current_version: VERSAO_ATUAL,
        latest_version: politica.latest_version,
      });
      Alert.alert(
        'Nova versão disponível',
        'Atualize o feith para ter as melhorias mais recentes.',
        [
          {
            text: 'Depois',
            style: 'cancel',
            onPress: () => {
              alertaAberto.current = false;
              void AsyncStorage.setItem(DISPENSADA_KEY, politica.latest_version);
              posthog?.capture('update_prompt_dismissed', { latest_version: politica.latest_version });
            },
          },
          {
            text: 'Atualizar',
            onPress: () => {
              alertaAberto.current = false;
              posthog?.capture('update_prompt_accepted', { latest_version: politica.latest_version });
              abrirLoja(politica.store_url);
            },
          },
        ],
        { cancelable: false },
      );
    } catch {}
  }, []);

  useEffect(() => {
    void checar();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void checar();
    });
    return () => sub.remove();
  }, [checar]);

  return estado;
}
