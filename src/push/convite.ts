export type MomentoConvite = 'onboarding' | 'pos_leitura' | 'sequencia' | 'ajustes';

export const INTERVALO_APOS_RECUSA_MS = 7 * 24 * 60 * 60 * 1000;

export function momentoNaHoje({
  status,
  optedOut,
  streak,
  recusadoEm,
  agora,
}: {
  status: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  optedOut: boolean;
  streak: number;
  recusadoEm: number | null;
  agora: number;
}): MomentoConvite | null {
  if (status === 'granted' || status === 'unsupported' || optedOut) return null;
  if (recusadoEm !== null && agora - recusadoEm < INTERVALO_APOS_RECUSA_MS) return null;
  if (status === 'denied') return 'ajustes';
  return streak >= 2 ? 'sequencia' : 'pos_leitura';
}
