/**
 * Ultimo recurso do widget: alguns versiculos embutidos no proprio bundle JS,
 * sem rede. So aparecem se o fetch ao `/reflections/daily/public` falhar E
 * nao houver nada em cache ainda (primeira instalacao, sem internet) — o
 * widget nunca pode ficar vazio. Texto em ARC (dominio publico); REVISAR
 * contra a traducao oficial do app antes de expandir esta lista (mesma
 * ressalva de `backend-feith/data/fallback_verses.py`, que e a fonte
 * principal de fallback).
 */
export interface LocalFallbackVerse {
  scripture_reference: string;
  excerpt: string;
}

const LOCAL_FALLBACK_VERSES: LocalFallbackVerse[] = [
  { scripture_reference: 'João 3:16', excerpt: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigénito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
  { scripture_reference: 'Salmos 23:1', excerpt: 'O Senhor é o meu pastor; nada me faltará.' },
  { scripture_reference: 'Filipenses 4:13', excerpt: 'Posso todas as coisas em Cristo que me fortalece.' },
  { scripture_reference: 'Provérbios 3:5-6', excerpt: 'Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento.' },
  { scripture_reference: 'Isaías 41:10', excerpt: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.' },
];

export function getLocalFallbackVerse(forDate: Date): LocalFallbackVerse {
  const startOfYear = new Date(forDate.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((forDate.getTime() - startOfYear.getTime()) / 86_400_000);
  return LOCAL_FALLBACK_VERSES[dayOfYear % LOCAL_FALLBACK_VERSES.length];
}
