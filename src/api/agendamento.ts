/**
 * Agendamento do lembrete diario.
 *
 * O backend trata lista de dias VAZIA como "todos os dias" — o filtro em
 * scripts/notification.py:37 e `if days and current_day not in days`, entao uma
 * lista vazia simplesmente nao filtra nada. A web grava com essa convencao
 * (infoSection.svelte:114), e o app precisa gravar igual, senao os dois
 * clientes discordariam sobre o que "vazio" significa.
 *
 * Vive aqui, e nao dentro da tela, porque e uma regra do contrato — e porque
 * uma inversao silenciosa aqui faria a pessoa parar de receber lembretes sem
 * nenhum sinal na interface.
 */
import type { WeekdayCode } from './types';

export const TODOS_OS_DIAS: WeekdayCode[] = [
  'seg',
  'ter',
  'qua',
  'qui',
  'sex',
  'sab',
  'dom',
];

/** O que o servidor guarda -> o que a tela mostra marcado. */
export function diasDoServidor(days: WeekdayCode[] | undefined | null): WeekdayCode[] {
  return days && days.length > 0 ? days : TODOS_OS_DIAS;
}

/** O que a tela tem marcado -> o que o servidor guarda. */
export function diasParaServidor(dias: WeekdayCode[]): WeekdayCode[] {
  return dias.length === TODOS_OS_DIAS.length ? [] : dias;
}
