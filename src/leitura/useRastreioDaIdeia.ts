import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { posthog } from '../config/posthog';

export type DesfechoDaIdeia = 'concluded' | 'deepened' | 'left' | 'background';

interface Sessao {
  uuid: string;
  inicio: number | null;
  totalMs: number;
  desfecho: DesfechoDaIdeia;
}

function reportar(sessao: Sessao, desfecho: DesfechoDaIdeia) {
  const total = sessao.totalMs + (sessao.inicio ? Date.now() - sessao.inicio : 0);
  if (total < 1000) return;
  posthog?.capture('core_idea_session_ended', {
    reflection_uuid: sessao.uuid,
    active_seconds: Math.round(total / 1000),
    outcome: desfecho,
  });
}

export function useRastreioDaIdeia(reflexaoUuid: string | null) {
  const sessao = useRef<Sessao | null>(null);

  useEffect(() => {
    if (!reflexaoUuid) return;
    sessao.current = { uuid: reflexaoUuid, inicio: Date.now(), totalMs: 0, desfecho: 'left' };

    const assinatura = AppState.addEventListener('change', (estado) => {
      const s = sessao.current;
      if (!s) return;
      if (estado === 'active') {
        if (s.inicio === null) s.inicio = Date.now();
      } else if (s.inicio !== null) {
        reportar(s, 'background');
        s.totalMs = 0;
        s.inicio = null;
      }
    });

    return () => {
      assinatura.remove();
      if (sessao.current) reportar(sessao.current, sessao.current.desfecho);
      sessao.current = null;
    };
  }, [reflexaoUuid]);

  return useCallback((desfecho: DesfechoDaIdeia) => {
    if (sessao.current) sessao.current.desfecho = desfecho;
  }, []);
}
