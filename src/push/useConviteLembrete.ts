import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { posthog } from '../config/posthog';
import { momentoNaHoje, type MomentoConvite } from './convite';
import { getPushState, optedOut, registerForPush, type PushStatus } from './registerDevice';

const RECUSADO_EM_KEY = 'feith.push.convite.recusado_em';

export async function registrarRecusa(momento: MomentoConvite) {
  await AsyncStorage.setItem(RECUSADO_EM_KEY, String(Date.now()));
  posthog?.capture('push_prompt_dismissed', { moment: momento });
}

export async function ativarLembretes(momento: MomentoConvite): Promise<PushStatus> {
  const status = await registerForPush({ promptIfNeeded: true });
  if (status === 'granted') {
    posthog?.capture('push_permission_granted', { moment: momento });
  } else if (status === 'denied') {
    posthog?.capture('push_permission_denied', { moment: momento });
    await AsyncStorage.setItem(RECUSADO_EM_KEY, String(Date.now()));
  }
  return status;
}

export function abrirAjustes(momento: MomentoConvite) {
  posthog?.capture('push_settings_opened', { moment: momento });
  void Linking.openSettings();
}

export function registrarExibicao(momento: MomentoConvite) {
  posthog?.capture('push_prompt_shown', { moment: momento });
}

export function useConviteLembrete(streak: number) {
  const [momento, setMomento] = useState<MomentoConvite | null>(null);
  const [ativando, setAtivando] = useState(false);
  const exibido = useRef<MomentoConvite | null>(null);

  const avaliar = useCallback(async () => {
    try {
      const [{ status }, desligado, recusado] = await Promise.all([
        getPushState(),
        optedOut(),
        AsyncStorage.getItem(RECUSADO_EM_KEY),
      ]);
      const proximo = momentoNaHoje({
        status,
        optedOut: desligado,
        streak,
        recusadoEm: recusado ? Number(recusado) : null,
        agora: Date.now(),
      });
      setMomento(proximo);
      if (proximo && exibido.current !== proximo) {
        exibido.current = proximo;
        registrarExibicao(proximo);
      }
    } catch {
      setMomento(null);
    }
  }, [streak]);

  useEffect(() => {
    void avaliar();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void avaliar();
    });
    return () => sub.remove();
  }, [avaliar]);

  const ativar = useCallback(async () => {
    if (!momento) return;
    setAtivando(true);
    try {
      await ativarLembretes(momento);
    } finally {
      setAtivando(false);
      setMomento(null);
    }
  }, [momento]);

  const recusar = useCallback(async () => {
    if (!momento) return;
    setMomento(null);
    await registrarRecusa(momento);
  }, [momento]);

  const ajustes = useCallback(() => {
    if (momento) abrirAjustes(momento);
  }, [momento]);

  return { momento, ativando, ativar, recusar, ajustes };
}
