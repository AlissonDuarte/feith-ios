/**
 * Telas visitadas e tempo em cada uma, para o PostHog.
 *
 * Manual e nao o `captureScreens` do PostHogProvider: o expo-router nao expoe o
 * NavigationContainer, e o proprio SDK manda desligar a captura automatica e
 * registrar as telas pela URL (posthog-react-native/dist/types.d.ts).
 *
 * Dois eventos:
 *   - `$screen` ao entrar, com o nome da rota ("leitura/[key]") e nao o
 *     pathname, para que todas as leituras somem na mesma linha do relatorio.
 *   - `screen_left` ao sair, com `duration_seconds`. O tempo pausa quando o app
 *     vai para segundo plano: deixar o telefone na mesa com a tela aberta nao
 *     e tempo de leitura. Ir para segundo plano tambem envia um `screen_left`
 *     (`reason: 'background'`), entao o tempo total numa tela e a SOMA de
 *     `duration_seconds`, nao a media por evento.
 */
import { usePathname, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { posthog } from './posthog';

/** Abaixo disso e redirecionamento do guard, nao visita. */
const DURACAO_MINIMA_MS = 500;

interface TelaAtual {
  tela: string;
  path: string;
  /** Tempo ja acumulado em primeiro plano antes da ultima pausa. */
  acumuladoMs: number;
  /** null enquanto o app esta em segundo plano. */
  inicio: number | null;
}

/** Segmentos sem os grupos: ['(tabs)', 'hoje'] vira "hoje". */
function nomeDaTela(segments: string[]): string {
  return segments.filter((s) => !s.startsWith('(')).join('/') || 'index';
}

function encerrar(atual: TelaAtual | null, motivo: 'navigation' | 'background') {
  if (!atual) return;
  const total = atual.acumuladoMs + (atual.inicio ? Date.now() - atual.inicio : 0);
  if (total < DURACAO_MINIMA_MS) return;
  posthog?.capture('screen_left', {
    screen: atual.tela,
    path: atual.path,
    duration_seconds: Math.round(total / 100) / 10,
    reason: motivo,
  });
}

export function useRastreioDeTelas() {
  const pathname = usePathname();
  const tela = nomeDaTela(useSegments());
  const atual = useRef<TelaAtual | null>(null);

  useEffect(() => {
    if (!posthog) return;
    encerrar(atual.current, 'navigation');
    atual.current = null;

    // A raiz e so o ponto de montagem do app/index.tsx; o guard sai dela antes
    // de qualquer coisa ser desenhada.
    if (pathname === '/') return;

    void posthog.screen(tela, { path: pathname });
    atual.current = { tela, path: pathname, acumuladoMs: 0, inicio: Date.now() };
  }, [tela, pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      const a = atual.current;
      if (!a) return;
      if (estado === 'active') {
        if (a.inicio === null) a.inicio = Date.now();
      } else if (a.inicio !== null) {
        a.acumuladoMs += Date.now() - a.inicio;
        a.inicio = null;
        // O app pode ser encerrado em segundo plano sem nunca voltar: o tempo
        // vai agora, e a contagem recomeca do zero se a pessoa retornar.
        encerrar(a, 'background');
        a.acumuladoMs = 0;
      }
    });
    return () => sub.remove();
  }, []);
}
