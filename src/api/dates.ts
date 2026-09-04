/**
 * Datas do feith.
 *
 * O backend NAO devolve ISO-8601 em nenhum campo visivel: validators do
 * Pydantic pre-formatam tudo para exibicao em pt-BR, em tres formatos
 * diferentes. Sao esses tres:
 *
 *   publish_at  "%d/%m/%Y"           reflection_schemas.py:22, history_schemas.py:17
 *   created_at  "%d/%m/%Y %H:%M"     reflection_service.py:175, user_note_service.py:92
 *   expires_at  "%H:%M:%S %d/%m/%Y"  shared_link_schemas.py:16   <- ordem invertida
 *
 * NUNCA use `new Date(str)` nisto. O parser do JS interpreta "03/04/2026" como
 * 4 de marco (mes/dia, formato americano), entao ordenar o historico por data
 * daria errado sem lancar erro nenhum — o tipo de bug que so aparece quando
 * alguem reclama que as reflexoes estao fora de ordem.
 *
 * Quando o backend passar a emitir os campos *_iso (item B16 do plano), estes
 * parsers somem.
 */

/** Monta um Date local a partir de partes ja separadas, validando o resultado. */
function build(
  day: number,
  month: number,
  year: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date | null {
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    year < 1900
  ) {
    return null;
  }

  // Mes e 0-indexado no Date.
  const date = new Date(year, month - 1, day, hour, minute, second);

  // O Date "rola" valores invalidos em silencio: 31/02 vira 3 de marco. Se as
  // partes nao voltarem iguais, a entrada nao era uma data real.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** "dd/mm/aaaa" — publish_at. Devolve meia-noite local. */
export function parseDateBR(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  return build(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** "dd/mm/aaaa HH:MM" — created_at. */
export function parseDateTimeBR(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return build(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]));
}

/**
 * "HH:MM:SS dd/mm/aaaa" — expires_at do link compartilhado.
 *
 * A hora vem PRIMEIRO neste, ao contrario dos outros dois. Nao e engano de
 * leitura: e o strftime de shared_link_schemas.py:16.
 */
export function parseExpiresBR(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2}):(\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  return build(
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
  );
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "12 de março de 2026" — cabecalho da leitura. */
export function formatLongPT(date: Date | null): string {
  if (!date) return '';
  return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * "hoje", "ontem", "há 3 dias", ou a data longa depois de uma semana.
 *
 * Usado nos feeds, onde a distancia importa mais que a data exata.
 */
export function formatRelativePT(date: Date | null, now: Date = new Date()): string {
  if (!date) return '';

  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days > 1 && days < 7) return `há ${days} dias`;
  return formatLongPT(date);
}

/** True se a data cai no mesmo dia local que `now`. */
export function isSameDay(date: Date | null, now: Date = new Date()): boolean {
  if (!date) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
