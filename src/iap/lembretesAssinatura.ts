import AsyncStorage from '@react-native-async-storage/async-storage';

import { posthog } from '../config/posthog';
import {
  DIA_MS,
  configDoFlag,
  lembreteDevido,
  registrarNoEstado,
  type EstadoLembretes,
  type OrigemPaywall,
} from './guiaAssinatura';

const FLAG = 'paywall-lembretes';
const PRIMEIRO_ACESSO_KEY = 'feith.paywall.primeiro_acesso';
const ULTIMA_EXIBICAO_KEY = 'feith.paywall.ultima_exibicao';
const LEMBRETES_KEY = 'feith.paywall.lembretes';

function configAtual() {
  return configDoFlag(posthog?.getFeatureFlag(FLAG), posthog?.getFeatureFlagPayload(FLAG));
}

async function lerEstado(): Promise<EstadoLembretes> {
  const [primeiro, ultima, lembretes] = await Promise.all([
    AsyncStorage.getItem(PRIMEIRO_ACESSO_KEY),
    AsyncStorage.getItem(ULTIMA_EXIBICAO_KEY),
    AsyncStorage.getItem(LEMBRETES_KEY),
  ]);
  let primeiroAcesso = primeiro ? Number(primeiro) : NaN;
  if (!Number.isFinite(primeiroAcesso)) {
    primeiroAcesso = Date.now();
    await AsyncStorage.setItem(PRIMEIRO_ACESSO_KEY, String(primeiroAcesso));
  }
  const ultimaExibicao = ultima ? Number(ultima) : NaN;
  const quantos = lembretes ? Number(lembretes) : NaN;
  return {
    primeiroAcesso,
    ultimaExibicao: Number.isFinite(ultimaExibicao) ? ultimaExibicao : null,
    lembretes: Number.isFinite(quantos) ? quantos : 0,
  };
}

export async function iniciarCalendarioAssinatura() {
  try {
    await lerEstado();
  } catch {}
}

export async function lembreteAssinaturaDevido(): Promise<string | null> {
  try {
    return lembreteDevido(await lerEstado(), Date.now(), configAtual());
  } catch {
    return null;
  }
}

export async function registrarExibicaoAssinatura(origem: OrigemPaywall) {
  try {
    const proximo = registrarNoEstado(await lerEstado(), origem, Date.now(), configAtual());
    await Promise.all([
      AsyncStorage.setItem(ULTIMA_EXIBICAO_KEY, String(proximo.ultimaExibicao)),
      AsyncStorage.setItem(LEMBRETES_KEY, String(proximo.lembretes)),
    ]);
  } catch {}
}

export async function diasDeUso(): Promise<number> {
  try {
    const { primeiroAcesso } = await lerEstado();
    return Math.max(0, Math.floor((Date.now() - primeiroAcesso) / DIA_MS));
  } catch {
    return 0;
  }
}
