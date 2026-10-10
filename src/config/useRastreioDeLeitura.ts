import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AppState,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { Reflection } from '../api/types';
import { REFLECTION_SECTIONS } from '../theme/tokens';
import { posthog } from './posthog';

const PALAVRAS_POR_MINUTO = 230;
const FRACAO_MINIMA_DO_TEMPO = 0.25;
const ROLAGEM_FIM = 0.9;
const INTERVALO_CHECAGEM_MS = 5000;

export type OrigemLeitura = 'hoje' | 'leitura';

interface Sessao {
  uuid: string;
  inicio: number | null;
  totalMs: number;
  reportadoMs: number;
  maxRolagem: number;
  leu: boolean;
}

function contarPalavras(reflexao: Reflection): number {
  const textos = [reflexao.bible_text, ...REFLECTION_SECTIONS.map((s) => reflexao[s.key])];
  return textos.join(' ').trim().split(/\s+/).filter(Boolean).length;
}

function tempoAtivoMs(s: Sessao): number {
  return s.totalMs + (s.inicio ? Date.now() - s.inicio : 0);
}

export function useRastreioDeLeitura(reflexao: Reflection | null, origem: OrigemLeitura) {
  const uuid = reflexao?.uuid || null;
  const palavras = useMemo(() => (reflexao ? contarPalavras(reflexao) : 0), [reflexao]);
  const tempoEstimado = Math.round((palavras / PALAVRAS_POR_MINUTO) * 60);

  const sessao = useRef<Sessao | null>(null);
  const fimDoTexto = useRef(0);
  const base = useRef({ origem, palavras, tempoEstimado });
  base.current = { origem, palavras, tempoEstimado };

  const propriedades = useCallback(
    (s: Sessao) => ({
      reflection_uuid: s.uuid,
      source: base.current.origem,
      word_count: base.current.palavras,
      estimated_read_seconds: base.current.tempoEstimado,
    }),
    [],
  );

  const checarLeitura = useCallback(() => {
    const s = sessao.current;
    if (!s || s.leu) return;
    const ativo = tempoAtivoMs(s) / 1000;
    if (s.maxRolagem < ROLAGEM_FIM || ativo < base.current.tempoEstimado * FRACAO_MINIMA_DO_TEMPO) return;
    s.leu = true;
    posthog?.capture('reflection_read', {
      ...propriedades(s),
      active_seconds: Math.round(ativo),
    });
  }, [propriedades]);

  const reportar = useCallback(
    (motivo: 'navigation' | 'background') => {
      const s = sessao.current;
      if (!s) return;
      checarLeitura();
      const total = tempoAtivoMs(s);
      const delta = total - s.reportadoMs;
      if (delta < 1000) return;
      s.reportadoMs = total;
      posthog?.capture('reflection_session_ended', {
        ...propriedades(s),
        active_seconds: Math.round(delta / 1000),
        total_active_seconds: Math.round(total / 1000),
        max_scroll_percent: Math.round(s.maxRolagem * 100),
        reached_end: s.maxRolagem >= ROLAGEM_FIM,
        read: s.leu,
        reason: motivo,
      });
    },
    [checarLeitura, propriedades],
  );

  useEffect(() => {
    if (!uuid || !posthog) return;
    sessao.current = {
      uuid,
      inicio: AppState.currentState === 'active' ? Date.now() : null,
      totalMs: 0,
      reportadoMs: 0,
      maxRolagem: 0,
      leu: false,
    };
    posthog.capture('reflection_opened', propriedades(sessao.current));

    const timer = setInterval(checarLeitura, INTERVALO_CHECAGEM_MS);
    return () => {
      clearInterval(timer);
      reportar('navigation');
      sessao.current = null;
    };
  }, [uuid, propriedades, checarLeitura, reportar]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      const s = sessao.current;
      if (!s) return;
      if (estado === 'active') {
        if (s.inicio === null) s.inicio = Date.now();
      } else if (s.inicio !== null) {
        s.totalMs += Date.now() - s.inicio;
        s.inicio = null;
        reportar('background');
      }
    });
    return () => sub.remove();
  }, [reportar]);

  const onLayoutTexto = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    fimDoTexto.current = y + height;
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const s = sessao.current;
      if (!s) return;
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const fim = fimDoTexto.current || contentSize.height;
      if (fim <= 0) return;
      const rolagem = Math.min(1, (contentOffset.y + layoutMeasurement.height) / fim);
      if (rolagem > s.maxRolagem) {
        s.maxRolagem = rolagem;
        checarLeitura();
      }
    },
    [checarLeitura],
  );

  return { onScroll, onLayoutTexto, scrollEventThrottle: 250 };
}
