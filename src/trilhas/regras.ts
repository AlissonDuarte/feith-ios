import type { ErrorPayload, TrailDayItem } from '../api/types';

export const HORARIOS = [
  { valor: '06:30', rotulo: 'Ao acordar', icone: 'sunny-outline' },
  { valor: '07:00', rotulo: 'Depois do café', icone: 'cafe-outline' },
  { valor: '12:30', rotulo: 'No almoço', icone: 'restaurant-outline' },
  { valor: '21:30', rotulo: 'Antes de dormir', icone: 'moon-outline' },
] as const;

const DIAS_SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

export function dataLocal(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function isoLocal(data: Date): string {
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${m}-${d}`;
}

export function diasEntre(de: Date, ate: Date): number {
  const a = Date.UTC(de.getFullYear(), de.getMonth(), de.getDate());
  const b = Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function proximaSegunda(hoje: Date): Date {
  const faltam = (8 - hoje.getDay()) % 7 || 7;
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + faltam);
}

export function rotuloHorario(valor: string): string {
  const [h, m] = valor.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function quandoLibera(iso: string, hoje: Date): string {
  const data = dataLocal(iso);
  const dias = diasEntre(hoje, data);
  if (dias <= 0) return 'Disponível hoje';
  if (dias === 1) return 'Libera amanhã';
  const dd = String(data.getDate()).padStart(2, '0');
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  return `Libera ${DIAS_SEMANA[data.getDay()]}, ${dd}/${mm}`;
}

export function descricaoDoDia(dia: TrailDayItem, hoje: Date, limiteDiario: boolean): string {
  if (dia.state === 'done') {
    const data = dia.completed_on ? dataLocal(dia.completed_on) : null;
    const quando = !data
      ? 'Concluído'
      : diasEntre(data, hoje) === 0
        ? 'Concluído hoje'
        : `Concluído ${DIAS_SEMANA[data.getDay()]}`;
    return `${quando} · ${dia.estimated_minutes} min`;
  }
  if (dia.state === 'available') return `Disponível agora · ${dia.estimated_minutes} min`;
  if (limiteDiario && diasEntre(hoje, dataLocal(dia.unlocks_on)) <= 0) return 'Volte amanhã · até 2 dias por dia';
  return quandoLibera(dia.unlocks_on, hoje);
}

export function codigoDoBloqueio(data: ErrorPayload): { code: string; unlocks_on?: string } | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: unknown }).detail;
  if (detail && typeof detail === 'object' && 'code' in detail) {
    return detail as { code: string; unlocks_on?: string };
  }
  return null;
}

export function mensagemDoBloqueio(code: string, unlocksOn: string | undefined, hoje: Date): string {
  if (code === 'limite_diario') return 'Você já leu 2 dias hoje. Volte amanhã para continuar.';
  if (code === 'fora_de_ordem') return 'Leia os dias na ordem: termine o anterior primeiro.';
  if (code === 'ainda_bloqueado' && unlocksOn) return `${quandoLibera(unlocksOn, hoje)}. Volte com calma, o texto rende mais assim.`;
  return 'Este dia ainda não está disponível.';
}
