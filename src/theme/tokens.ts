/**
 * Design tokens do fidio.
 *
 * Fonte de verdade compartilhada entre o NativeWind (tailwind.config.js deste
 * projeto consome palette.js) e os componentes que usam StyleSheet direto.
 *
 * As telas referenciam `scheme.*`, nunca `colors.*` cru: e o que permite os
 * tres modos de leitura (claro, escuro, sepia) que o PRODUCT_ROADMAP.md pede
 * na secao 4 sem tocar em nenhuma tela.
 */

import palette from './palette';

export const colors = palette as Record<string, string>;

export type ReadingMode = 'light' | 'dark' | 'sepia';

export interface Scheme {
  canvas: string;
  surface: string;
  surfaceGlass: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSubtle: string;
}

/**
 * Sepia nao e "claro com fundo amarelo": num app de leitura longa ele existe
 * para baixar o contraste sem apagar a tela, entao o texto vai para marrom
 * quente e o acento troca ambar por oxblood queimado — a identidade editorial
 * do marketing da web, que combina com pergaminho.
 */
export const schemes: Record<ReadingMode, Scheme> = {
  light: {
    canvas: palette.bg,
    surface: palette.surface,
    surfaceGlass: 'rgba(255,255,255,0.7)',
    border: palette.border,
    textPrimary: palette.text,
    textSecondary: palette.muted,
    textMuted: palette['muted-soft'],
    accent: palette.primary,
    accentSubtle: palette['primary-tint'],
  },
  dark: {
    canvas: palette['dark-bg'],
    surface: palette['dark-surface'],
    surfaceGlass: 'rgba(17,26,43,0.7)',
    border: 'rgba(255,255,255,0.08)',
    textPrimary: palette['dark-text'],
    textSecondary: palette['muted-soft'],
    textMuted: palette.muted,
    accent: '#FBBF24',
    accentSubtle: 'rgba(245,158,11,0.12)',
  },
  sepia: {
    canvas: palette['parchment-deep'],
    surface: '#FBF5E6',
    surfaceGlass: 'rgba(251,245,230,0.75)',
    border: '#E0D3B4',
    textPrimary: '#3B3226',
    textSecondary: '#6B5D49',
    textMuted: '#8A7A62',
    accent: '#A9762F',
    accentSubtle: '#EFE0BF',
  },
};

/**
 * As 6 secoes de uma reflexao, na ordem em que TextReader.svelte:8-15 as
 * renderiza. O campo `key` casa com o payload de /api/reflections/daily.
 *
 * `bible_text` fica de fora desta lista de proposito: ele e o texto biblico em
 * si, exibido em destaque no topo, e nao um dos passos numerados da exegese.
 */
export const REFLECTION_SECTIONS = [
  { key: 'context', title: 'Contexto' },
  { key: 'exegesis', title: 'Exegese' },
  { key: 'doctrine', title: 'Doutrina' },
  { key: 'application', title: 'Aplicação' },
  { key: 'prayer', title: 'Oração' },
] as const;

export type ReflectionSectionKey = (typeof REFLECTION_SECTIONS)[number]['key'];

export const fonts = {
  /** Referencias biblicas, titulos de secao, numerais de destaque. */
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
  /** Corpo do texto, UI. */
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Espelha os rounded-2xl / 3xl / [32px] usados na web. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 9999,
} as const;

/**
 * Escala tipografica. `body` e 17/26 porque e a leitura principal do app — o
 * default de 14 do RN e pequeno demais para um texto que a pessoa le todo dia.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 22, lineHeight: 28 },
  body: { fontSize: 17, lineHeight: 26 },
  caption: { fontSize: 13, lineHeight: 18 },
  overline: { fontSize: 11, lineHeight: 16, letterSpacing: 2 },
} as const;

/**
 * Teto do Dynamic Type. Ignorar o tamanho de texto acessivel num app DE
 * LEITURA e falha de UX; deixar escalar sem limite quebra os cards. 1.4 e o
 * ponto em que o layout ainda respira.
 */
export const MAX_FONT_SCALE = 1.4;
