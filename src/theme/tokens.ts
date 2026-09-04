/**
 * Design tokens do feith.
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
  /** Fundo da tela. */
  canvas: string;
  /** Fundo alternativo, para blocos que precisam se destacar do canvas. */
  canvasWarm: string;
  /** Cards e campos. */
  surface: string;
  surfaceGlass: string;
  /** Hairline padrao. */
  border: string;
  /** Hairline ainda mais leve, para separadores internos de lista. */
  borderSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Overlines e metadados de baixa hierarquia. */
  textGhost: string;
  /** Oxblood: acao, links, elementos ativos. */
  accent: string;
  accentPressed: string;
  accentSubtle: string;
  /** Ouro: fios, numerais, ornamento. Nunca e cor de acao. */
  gold: string;
  goldSoft: string;
  goldSubtle: string;
  /** Texto sobre o acento. */
  onAccent: string;
}

/**
 * Sepia nao e "claro com fundo amarelo": num app de leitura longa ele existe
 * para baixar o contraste sem apagar a tela, entao o texto vai para marrom
 * quente. O modo escuro, pelo mesmo motivo, e carvao amarronzado e nao slate
 * azulado — um app de leitura no escuro continua sendo papel sem luz.
 */
export const schemes: Record<ReadingMode, Scheme> = {
  light: {
    canvas: palette.cream,
    canvasWarm: palette.warm,
    surface: palette.surface,
    surfaceGlass: palette.glass,
    border: palette.rule,
    borderSoft: palette['rule-soft'],
    textPrimary: palette.ink,
    textSecondary: palette['ink-muted'],
    textMuted: palette['ink-faint'],
    textGhost: palette['ink-ghost'],
    accent: palette.oxblood,
    accentPressed: palette['oxblood-light'],
    accentSubtle: palette['oxblood-tint'],
    gold: palette.gold,
    goldSoft: palette['gold-light'],
    goldSubtle: palette['gold-tint'],
    onAccent: '#FFFFFF',
  },
  dark: {
    canvas: palette['dark-bg'],
    canvasWarm: '#1A1613',
    surface: palette['dark-surface'],
    surfaceGlass: 'rgba(30,26,22,0.78)',
    border: palette['dark-rule'],
    borderSoft: '#241F1A',
    textPrimary: palette['dark-text'],
    textSecondary: '#B8AE9E',
    textMuted: '#8C8375',
    textGhost: '#6B6459',
    accent: '#C9736A',
    accentPressed: '#D98A80',
    accentSubtle: 'rgba(201,115,106,0.12)',
    gold: palette['gold-light'],
    goldSoft: palette['gold-pale'],
    goldSubtle: 'rgba(184,156,92,0.12)',
    onAccent: '#15120F',
  },
  sepia: {
    canvas: palette['parchment-deep'],
    canvasWarm: '#EFE5CC',
    surface: '#FBF5E6',
    surfaceGlass: 'rgba(251,245,230,0.78)',
    border: '#E0D3B4',
    borderSoft: '#EBE1C9',
    textPrimary: '#3B3226',
    textSecondary: '#6B5D49',
    textMuted: '#8A7A62',
    textGhost: '#A2917A',
    accent: palette.oxblood,
    accentPressed: palette['oxblood-light'],
    accentSubtle: '#EFE0BF',
    gold: palette.gold,
    goldSoft: palette['gold-light'],
    goldSubtle: '#EFE4C8',
    onAccent: '#FBF5E6',
  },
};

/**
 * As 6 secoes de uma reflexao, na ordem em que TextReader.svelte:8-15 as
 * renderiza. O campo `key` casa com o payload de /api/reflections/daily.
 *
 * `bible_text` fica de fora desta lista de proposito: ele e o texto biblico em
 * si, exibido em destaque no topo, e nao um dos passos numerados da exegese.
 *
 * Os titulos sao os longos da web ("Contexto Histórico e Literário"), com o
 * curto guardado a parte: o longo e o titulo da secao, o curto e a etiqueta que
 * cabe num sumario ou num chip.
 */
export const REFLECTION_SECTIONS = [
  { key: 'context', title: 'Contexto Histórico e Literário', short: 'Contexto' },
  { key: 'exegesis', title: 'Análise Exegética', short: 'Exegese' },
  { key: 'doctrine', title: 'Relação Doutrinária', short: 'Doutrina' },
  { key: 'application', title: 'Aplicação Prática', short: 'Aplicação' },
  { key: 'prayer', title: 'Oração Final', short: 'Oração' },
] as const;

export type ReflectionSectionKey = (typeof REFLECTION_SECTIONS)[number]['key'];

/**
 * Fontes.
 *
 * A identidade editorial vive no PESO BAIXO da serifada: a landing usa
 * `font-light` em todos os titulos, e e isso que separa "Cormorant" de
 * "Cormorant que parece Times New Roman". O 300 e o titulo; o 400 italico e a
 * citacao e o numeral; o 500/600 so aparecem em texto pequeno, onde o 300
 * sumiria.
 */
export const fonts = {
  /** Titulos. Cormorant Light — o `font-light` da landing. */
  display: 'CormorantGaramond_300Light',
  /** Serifada em corpo normal: subtitulos e o texto biblico. */
  serif: 'CormorantGaramond_400Regular',
  /** Citacoes, numerais das secoes, enfase editorial. */
  serifItalic: 'CormorantGaramond_400Regular_Italic',
  /**
   * Serifada pequena, onde o Light perderia legibilidade: barra de navegacao,
   * subtitulos dentro do Markdown.
   *
   * Quatro cortes e o teto: cada TTF do Cormorant pesa ~667KB, e um quinto
   * peso intermediario custaria mais do que a diferenca visual entre 500 e 600
   * em corpo 20.
   */
  serifSemi: 'CormorantGaramond_600SemiBold',
  /** Corpo do texto e UI. */
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

/**
 * Cantos.
 *
 * A landing usa `border-radius: 0` nos CTAs — canto reto e parte da identidade
 * editorial, e nao um esquecimento. No iPhone o zero absoluto fica agressivo ao
 * toque, entao `sharp` e 2: le como reto, sem a aresta viva.
 */
export const radius = {
  sharp: 2,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const;

/**
 * Escala tipografica.
 *
 * `body` e 17/28 porque e a leitura principal do app — o default de 14 do RN e
 * pequeno demais para um texto que a pessoa le todo dia, e a entrelinha de 28
 * (1.65) e a de um texto longo, nao a de uma UI.
 *
 * As serifadas levam `letterSpacing` levemente negativo (o `tracking-tight` da
 * web): em corpo grande o Cormorant abre demais sem isso.
 */
export const type = {
  hero: { fontSize: 40, lineHeight: 46, letterSpacing: -0.6 },
  display: { fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  heading: { fontSize: 19, lineHeight: 26, letterSpacing: -0.1 },
  body: { fontSize: 17, lineHeight: 28 },
  bodySm: { fontSize: 15, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 20 },
  /** Etiquetas maiusculas com o `letter-spacing: 0.3em` da landing. */
  overline: { fontSize: 10, lineHeight: 14, letterSpacing: 3 },
  micro: { fontSize: 11, lineHeight: 16, letterSpacing: 0.4 },
} as const;

/** Ritmo vertical. Multiplos de 4, nomeados pelo uso e nao pelo numero. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 44,
  /** Margem horizontal das telas. */
  gutter: 24,
} as const;

/**
 * Sombras.
 *
 * A `.glass-card:hover` da web usa `0 20px 60px rgba(0,0,0,0.06)` — sombra
 * larga, difusa e quase invisivel. E o oposto da sombra curta e escura do
 * Material: ela nao desenha uma borda, so tira o card do plano do papel.
 */
export const shadow = {
  card: {
    shadowColor: '#3A2F1E',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#3A2F1E',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
} as const;

/**
 * Teto do Dynamic Type. Ignorar o tamanho de texto acessivel num app DE
 * LEITURA e falha de UX; deixar escalar sem limite quebra os cards. 1.4 e o
 * ponto em que o layout ainda respira.
 */
export const MAX_FONT_SCALE = 1.4;
