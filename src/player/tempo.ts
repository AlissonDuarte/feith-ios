/**
 * Formatacao de tempo do player, isolada do hook.
 *
 * Separado de useAudioReflexao.ts porque aquele modulo importa `expo-audio`, e
 * o runner de testes (`node --test`) nao carrega modulo nativo. Aqui e funcao
 * pura, entao da para testar de verdade.
 */

/** m:ss — o mesmo formato do player da web. */
export function formatarTempo(segundos: number): string {
  // `duration` vem 0 antes do metadata carregar e NaN em alguns estados de
  // buffer. Sem esta guarda o player mostra "NaN:NaN" no lugar do tempo, que e
  // o tipo de detalhe que faz a feature parecer quebrada mesmo tocando.
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
