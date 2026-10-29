import type { TrailSummary } from '../api/types';

export type CategoriaTrilha = 'gratis' | 'duas_vozes' | 'apoiadores';

export const LIMITE_PRATELEIRA = 6;

export const CATEGORIAS: Record<
  CategoriaTrilha,
  { titulo: string; legenda: string; filtro: (t: TrailSummary) => boolean }
> = {
  gratis: {
    titulo: 'Para começar',
    legenda: 'Grátis',
    filtro: (t) => t.tier === 'free',
  },
  duas_vozes: {
    titulo: 'Em Duas Vozes',
    legenda: 'Protestante e católica',
    filtro: (t) => t.tier !== 'free' && t.kind === 'duas_vozes',
  },
  apoiadores: {
    titulo: 'Para Apoiadores',
    legenda: 'Trilhas completas',
    filtro: (t) => t.tier !== 'free' && t.kind !== 'duas_vozes',
  },
};
