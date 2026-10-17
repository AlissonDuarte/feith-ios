export const STREAK_MILESTONES = [7, 14, 30, 100, 365] as const;

export function proximoMarco(streak: number): number | null {
  return STREAK_MILESTONES.find((m) => m > streak) ?? null;
}

/** Fração (0-1) do caminho já andado até o próximo marco, para o anel. */
export function progressoParaProximoMarco(streak: number): number {
  const proximo = proximoMarco(streak);
  if (proximo === null) return 1;
  const anterior = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  const faixa = proximo - anterior;
  return faixa <= 0 ? 1 : (streak - anterior) / faixa;
}
