import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '../api/client';
import type { FeatureOnboarding } from '../api/types';
import { posthog } from '../config/posthog';

/**
 * Onboarding curto de feature, decidido pelo servidor (ver
 * onboarding_service.py): o app so pergunta "tem algo pendente?" e mostra o
 * que vier — toda a logica de FIFO e de intervalo entre onboardings (pra
 * ninguem receber uma fila inteira de uma vez) vive no backend.
 *
 * So entra em jogo quando ha sessao: RouteGuard (app/_layout.tsx) monta o
 * componente que usa este hook apenas apos login E apos o onboarding de
 * primeiro uso (CoachTour/onboarding_completed) estar concluido.
 */
export function useFeatureOnboarding() {
  const [item, setItem] = useState<FeatureOnboarding | null>(null);
  const [resolvendo, setResolvendo] = useState(false);

  const avaliar = useCallback(async () => {
    try {
      const proximo = await api.getNextOnboarding();
      setItem(proximo);
      if (proximo) posthog?.capture('feature_onboarding_shown', { key: proximo.key });
    } catch {
      setItem(null);
    }
  }, []);

  useEffect(() => {
    void avaliar();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void avaliar();
    });
    return () => sub.remove();
  }, [avaliar]);

  const resolver = useCallback(
    async (outcome: 'completed' | 'dismissed') => {
      if (!item) return;
      setResolvendo(true);
      try {
        await api.resolveOnboarding(item.key, outcome);
        posthog?.capture('feature_onboarding_resolved', { key: item.key, outcome });
      } catch {
        // Falha de rede aqui nao pode travar a tela — o item so some
        // localmente; na proxima avaliacao o servidor decide de novo (ele e
        // idempotente, entao nenhum efeito colateral em tentar de novo).
      } finally {
        setResolvendo(false);
        setItem(null);
      }
    },
    [item],
  );

  const completar = useCallback(() => resolver('completed'), [resolver]);
  const dispensar = useCallback(() => resolver('dismissed'), [resolver]);

  return { item, resolvendo, completar, dispensar };
}
