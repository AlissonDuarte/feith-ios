export const DIA_MS = 24 * 60 * 60 * 1000;

export type OrigemPaywall =
  | 'onboarding'
  | 'lembrete'
  | 'audio'
  | 'hoje_badge'
  | 'hoje_card'
  | 'historico'
  | 'perfil'
  | 'trilha'
  | 'anotacao'
  | 'favorito'
  | 'desconhecida';

export interface ConfigLembretes {
  ativo: boolean;
  marcos: number[];
  intervaloMensalDias: number;
  intervaloMinimoDias: number;
}

export const CONFIG_PADRAO: ConfigLembretes = {
  ativo: true,
  marcos: [7, 14, 30],
  intervaloMensalDias: 30,
  intervaloMinimoDias: 7,
};

export interface EstadoLembretes {
  primeiroAcesso: number;
  ultimaExibicao: number | null;
  lembretes: number;
}

const ORIGENS: OrigemPaywall[] = [
  'onboarding',
  'lembrete',
  'audio',
  'hoje_badge',
  'hoje_card',
  'historico',
  'perfil',
  'trilha',
  'anotacao',
  'favorito',
];

export function origemDe(valor: unknown): OrigemPaywall {
  return ORIGENS.includes(valor as OrigemPaywall) ? (valor as OrigemPaywall) : 'desconhecida';
}

function diasValidos(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null;
}

export function configDoFlag(valor: unknown, payload: unknown): ConfigLembretes {
  if (valor === false) return { ...CONFIG_PADRAO, ativo: false };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return CONFIG_PADRAO;
  const p = payload as Record<string, unknown>;
  const marcos = Array.isArray(p.marcos)
    ? p.marcos.map(diasValidos).filter((d): d is number => d !== null).sort((a, b) => a - b)
    : null;
  return {
    ativo: true,
    marcos: marcos && marcos.length > 0 ? marcos : CONFIG_PADRAO.marcos,
    intervaloMensalDias: diasValidos(p.intervaloMensalDias) ?? CONFIG_PADRAO.intervaloMensalDias,
    intervaloMinimoDias: diasValidos(p.intervaloMinimoDias) ?? CONFIG_PADRAO.intervaloMinimoDias,
  };
}

export function lembreteDevido(
  estado: EstadoLembretes,
  agora: number,
  config: ConfigLembretes = CONFIG_PADRAO,
): string | null {
  if (!config.ativo) return null;
  const { primeiroAcesso, ultimaExibicao, lembretes } = estado;
  if (ultimaExibicao !== null && agora - ultimaExibicao < config.intervaloMinimoDias * DIA_MS) {
    return null;
  }
  if (lembretes < config.marcos.length) {
    const marco = config.marcos[lembretes];
    return agora >= primeiroAcesso + marco * DIA_MS ? `${marco}d` : null;
  }
  const base = ultimaExibicao ?? primeiroAcesso;
  return agora - base >= config.intervaloMensalDias * DIA_MS ? 'mensal' : null;
}

export function registrarNoEstado(
  estado: EstadoLembretes,
  origem: OrigemPaywall,
  agora: number,
  config: ConfigLembretes = CONFIG_PADRAO,
): EstadoLembretes {
  if (origem !== 'lembrete') return { ...estado, ultimaExibicao: agora };
  const vencidos = config.marcos.filter((d) => estado.primeiroAcesso + d * DIA_MS <= agora).length;
  return {
    ...estado,
    ultimaExibicao: agora,
    lembretes: Math.max(estado.lembretes + 1, vencidos),
  };
}

export function fraseDoLembrete(streak: number, diasDeUso: number): string {
  if (streak >= 3) return `${streak} dias seguidos com a Palavra. Que constância!`;
  if (diasDeUso >= 7) {
    const semanas = Math.floor(diasDeUso / 7);
    const tempo = diasDeUso >= 30
      ? `${Math.floor(diasDeUso / 30) === 1 ? 'um mês' : `${Math.floor(diasDeUso / 30)} meses`}`
      : semanas === 1
        ? 'uma semana'
        : `${semanas} semanas`;
    return `Você caminha com o feith há ${tempo}.`;
  }
  return 'Que bom ter você por aqui.';
}
