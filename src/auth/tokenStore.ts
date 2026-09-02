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

import type { UserProfile } from '../api/types';

const TOKEN_KEY = 'fidio_token';
const EXPIRES_KEY = 'fidio_token_expires';
const PROFILE_KEY = 'fidio_profile';

export interface StoredSession {
  token: string | null;
  /** Epoch em ms, decodificado do `exp` do JWT. */
  expiresAt: number | null;
  profile: UserProfile | null;
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
  const [token, rawExpires, rawProfile] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
    SecureStore.getItemAsync(EXPIRES_KEY).catch(() => null),
    AsyncStorage.getItem(PROFILE_KEY).catch(() => null),
  ]);

  let profile: UserProfile | null = null;
  if (rawProfile) {
    try {
      profile = JSON.parse(rawProfile) as UserProfile;
    } catch {
      // Cache corrompido nao pode derrubar o boot: seguimos sem perfil em
      // cache e o /users/profile do layout raiz repopula.
      profile = null;
    }
  }

  const expiresAt = rawExpires ? Number(rawExpires) : token ? jwtExpiresAt(token) : null;

  return { token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : null, profile };
}

export async function saveToken(token: string): Promise<void> {
  const expiresAt = jwtExpiresAt(token);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  if (expiresAt) {
    await SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt));
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(EXPIRES_KEY).catch(() => undefined),
    AsyncStorage.removeItem(PROFILE_KEY).catch(() => undefined),
  ]);
}
