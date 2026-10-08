export type SituacaoVersao = 'em_dia' | 'recomendada' | 'obrigatoria';

export function compararVersoes(a: string, b: string): number {
  const partes = (v: string) => v.split('.').map((p) => parseInt(p, 10) || 0);
  const pa = partes(a);
  const pb = partes(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export function situacaoDaVersao(
  atual: string,
  politica: { min_version: string; latest_version: string },
): SituacaoVersao {
  if (compararVersoes(atual, politica.min_version) < 0) return 'obrigatoria';
  if (compararVersoes(atual, politica.latest_version) < 0) return 'recomendada';
  return 'em_dia';
}
