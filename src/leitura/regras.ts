import type { TrailSummary } from '../api/types';

const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const PALAVRAS_POR_MINUTO = 230;

export function isoDoDia(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

export interface DiaDaSemana {
  iso: string;
  letra: string;
  lido: boolean;
  hoje: boolean;
}

export function ultimosSeteDias(hoje: Date, lidos: Set<string>): DiaDaSemana[] {
  return Array.from({ length: 7 }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (6 - i));
    const iso = isoDoDia(data);
    return { iso, letra: LETRAS[data.getDay()], lido: lidos.has(iso), hoje: i === 6 };
  });
}

export function diasDaSequencia(hoje: Date, sequencia: number, leuHoje: boolean): Set<string> {
  const inicio = leuHoje ? 0 : 1;
  return new Set(
    Array.from({ length: sequencia }, (_, i) =>
      isoDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i - inicio)),
    ),
  );
}

export function ehNoite(data: Date): boolean {
  const hora = data.getHours();
  return hora >= 18 || hora < 5;
}

export function fraseCentral(texto: string | null | undefined, limite = 110): string | null {
  const limpo = (texto ?? '').trim();
  if (!limpo) return null;
  const frases = limpo.match(/[^.!?]+[.!?]+/g)?.map((f) => f.trim()) ?? [limpo];
  const ultima = frases[frases.length - 1];
  if (ultima.length <= limite && frases.length > 1) return ultima;
  if (frases[0].length <= limite) return frases[0];
  return `${limpo.slice(0, limite).replace(/\s+\S*$/, '')}…`;
}

export function trechoDoVersiculo(texto: string | null | undefined, limite = 90): string {
  const limpo = (texto ?? '').trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite + 1);
  const pontos = ['.', ';', '!', '?'].map((p) => corte.lastIndexOf(p));
  const fim = Math.max(...pontos);
  if (fim >= 25) return `${corte.slice(0, fim)}.`;
  return `${corte.replace(/\s+\S*$/, '')}…`;
}

function contarPalavras(texto: string | null | undefined): number {
  return (texto ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export function minutosDeLeitura(textos: (string | null | undefined)[]): number {
  const palavras = textos.reduce((soma, t) => soma + contarPalavras(t), 0);
  return Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
}

export function secaoAtual(posicoes: number[], rolagem: number, folga = 140): number {
  let atual = -1;
  posicoes.forEach((y, i) => {
    if (rolagem + folga >= y) atual = i;
  });
  return atual;
}

export type FiltroTrilhas = 'para_voce' | 'curtas' | 'livros' | 'duas_vozes';

export function filtrarTrilhas(trilhas: TrailSummary[], filtro: FiltroTrilhas, ativa?: string | null): TrailSummary[] {
  const semAtiva = trilhas.filter((t) => t.slug !== ativa);
  if (filtro === 'curtas') return semAtiva.filter((t) => t.days_count <= 5).sort(porNivelEDuracao);
  if (filtro === 'livros') return semAtiva.filter((t) => t.kind === 'livro').sort(porNivelEDuracao);
  if (filtro === 'duas_vozes') return semAtiva.filter((t) => t.kind === 'duas_vozes').sort(porNivelEDuracao);
  return semAtiva.filter((t) => t.progress?.status !== 'completed').sort(porNivelEDuracao);
}

function porNivelEDuracao(a: TrailSummary, b: TrailSummary): number {
  return Number(a.locked) - Number(b.locked) || a.days_count - b.days_count || a.name.localeCompare(b.name);
}

export function rotuloDaNota(criadaEm: Date | null, hoje: Date): string {
  if (!criadaEm) return 'Sua última anotação';
  const dias = Math.round(
    (new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime() -
      new Date(criadaEm.getFullYear(), criadaEm.getMonth(), criadaEm.getDate()).getTime()) /
      86_400_000,
  );
  if (dias === 0) return 'Hoje você anotou';
  if (dias === 1) return 'Ontem você anotou';
  return 'Sua última anotação';
}
