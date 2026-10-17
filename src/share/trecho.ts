/**
 * Extraída de `compartilhar()` em app/leitura/[key].tsx — era inline ali e o
 * cartão de compartilhamento (ShareCard) precisa do mesmo corte, então virou
 * uma função compartilhada em vez de duas cópias divergindo com o tempo.
 */
export function trechoDe(bibleText: string | undefined | null, max = 200): string {
  const texto = bibleText?.trim();
  if (!texto) return '';
  return texto.length > max ? `${texto.slice(0, max).trim()}...` : texto;
}
