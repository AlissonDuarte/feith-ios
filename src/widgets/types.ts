export interface VerseWidgetData {
  scripture_reference: string;
  excerpt: string;
  /** Veio do fallback (nivel 2 ou 3 do backend), nao da reflexao de hoje. */
  isFallback: boolean;
  /** Veio do cache local (AsyncStorage), nao de uma resposta de rede fresca. */
  isStale: boolean;
}
