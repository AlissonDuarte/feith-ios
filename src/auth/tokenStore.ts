/**
 * Persistencia de sessao.
 *
 * A web guarda a sessao inteira num cookie httpOnly e nao tem nada em
 * localStorage (o `token` que Sidebar.svelte:71 tenta remover no logout nunca
 * foi escrito por ninguem). Num app nativo o cookie nao serve, entao o token
 * vive aqui.
 *
 * Token no SecureStore (Keychain no iOS); o objeto de perfil, que nao e
 * segredo, vai no AsyncStorage — o SecureStore avisa acima de 2KB e o perfil
 * pode crescer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { UserSummary } from '../api/types';

const TOKEN_KEY = 'fidio_token';
const EXPIRES_KEY = 'fidio_token_expires';
const SUMMARY_KEY = 'fidio_summary';

export interface StoredSession {
  token: string | null;
  /** Epoch em ms, decodificado do `exp` do JWT. */
  expiresAt: number | null;
  /** Ultimo summary conhecido — serve so para a primeira tela nao piscar. */
  summary: UserSummary | null;
}

/**
 * Le o `exp` do JWT sem biblioteca e sem verificar assinatura.
 *
 * Serve SO para UX: decidir se vale a pena tentar uma requisicao ou ir direto
 * para o login, e avisar que a sessao esta perto de expirar. Autorizacao de
 * verdade e sempre do servidor.
 *
 * O payload e base64url; o atob do Hermes nao aceita `-` e `_`, entao a
 * conversao e explicita.
 */
export function jwtExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(globalThis.atob(padded)) as { exp?: number };

    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<StoredSession> {
  const [token, rawExpires, rawSummary] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
    SecureStore.getItemAsync(EXPIRES_KEY).catch(() => null),
    AsyncStorage.getItem(SUMMARY_KEY).catch(() => null),
  ]);

  let summary: UserSummary | null = null;
  if (rawSummary) {
    try {
      summary = JSON.parse(rawSummary) as UserSummary;
    } catch {
      // Cache corrompido nao pode derrubar o boot: seguimos sem cache e o
      // /users/me/summary do layout raiz repopula.
      summary = null;
    }
  }

  const expiresAt = rawExpires ? Number(rawExpires) : token ? jwtExpiresAt(token) : null;

  return { token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : null, summary };
}

export async function saveToken(token: string): Promise<void> {
  const expiresAt = jwtExpiresAt(token);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (expiresAt) {
    await SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt));
  }
}

export async function saveSummary(summary: UserSummary): Promise<void> {
  await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(EXPIRES_KEY).catch(() => undefined),
    AsyncStorage.removeItem(SUMMARY_KEY).catch(() => undefined),
  ]);
}
