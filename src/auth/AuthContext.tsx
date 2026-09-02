/**
 * Estado de autenticacao.
 *
 * A web nao tem nada equivalente: `front_fide` nao possui store de auth nem
 * guard de rota — cada pagina /user/** simplesmente renderiza e deixa os
 * fetches falharem quando nao ha sessao, e um 401 vira um toast que nao leva a
 * lugar nenhum. Aqui a sessao e um estado unico e o guard vive em
 * app/_layout.tsx.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { api, setToken, setUnauthorizedHandler } from '../api/client';
import type { AuthResponse, Plan, UserProfile } from '../api/types';
import { signOutFromGoogle } from './googleSignIn';
import { unregisterFromPush } from '../push/registerDevice';
import { clearSession, loadSession, saveProfile, saveToken } from './tokenStore';

/**
 * Quantos dias antes de expirar o app comeca a avisar.
 *
 * O JWT do backend dura 7 dias e NAO ha refresh (auth_service.py:71). Ate o
 * item B3 do plano existir, o melhor que da para fazer e avisar antes de a
 * pessoa ser deslogada no meio da leitura. Quando /users/refresh entrar, este
 * aviso vira renovacao silenciosa.
 */
const AVISO_EXPIRACAO_MS = 2 * 24 * 60 * 60 * 1000;

interface AuthState {
  profile: UserProfile | null;
  token: string | null;
  expiresAt: number | null;
  /** true ate a sessao persistida terminar de carregar — evita piscar o login. */
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** `plan === 'supporter'`. Fonte unica de entitlement no app. */
  isSupporter: boolean;
  /** Dias ate a sessao expirar, ou null se ainda falta muito. */
  diasParaExpirar: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    profile: null,
    token: null,
    expiresAt: null,
    loading: true,
  });

  // Evita setState depois do unmount durante o boot assincrono.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    // Antes de limpar a sessao, enquanto o Bearer ainda vale: sem isto o
    // aparelho continua recebendo os lembretes do dono anterior.
    await unregisterFromPush();
    // Best-effort: o endpoint so apaga cookie, entao falhar aqui nao importa.
    await api.logout().catch(() => undefined);

    setToken(null);
    await clearSession();
    // Sem isto o SDK do Google guarda a conta e o proximo toque no botao
    // reentra sem perguntar — ruim para quem deslogou para trocar de conta.
    await signOutFromGoogle();

    if (mounted.current) {
      setState({ profile: null, token: null, expiresAt: null, loading: false });
    }
  }, []);

  const signIn = useCallback(async (response: AuthResponse) => {
    setToken(response.access_token);
    await saveToken(response.access_token);

    // O login nao devolve o perfil; busca agora para o app ja abrir sabendo o
    // plano e o estado do onboarding.
    let profile: UserProfile | null = null;
    try {
      profile = await api.getProfile();
      await saveProfile(profile);
    } catch {
      // Sem perfil o app ainda funciona: o layout raiz tenta de novo.
    }

    if (mounted.current) {
      setState({
        profile,
        token: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
        loading: false,
      });
    }
  }, []);

  const updateProfile = useCallback(async (profile: UserProfile) => {
    await saveProfile(profile);
    if (mounted.current) {
      setState((s) => ({ ...s, profile }));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const fresh = await api.getProfile();
      await updateProfile(fresh);
    } catch {
      // Offline ou token morto: seguimos com o perfil em cache. Se o token
      // estiver realmente invalido, o handler de 401 desloga.
    }
  }, [updateProfile]);

  // Liga o client a este contexto: um 401 sem recuperacao desloga.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Boot: reidrata a sessao persistida.
  useEffect(() => {
    (async () => {
      const session = await loadSession();

      // Token ja vencido nao merece uma ida a rede so para tomar 401.
      const vencido = session.expiresAt !== null && session.expiresAt <= Date.now();
      if (!session.token || vencido) {
        if (vencido) await clearSession();
        setToken(null);
        if (mounted.current) {
          setState({ profile: null, token: null, expiresAt: null, loading: false });
        }
        return;
      }

      setToken(session.token);
      if (mounted.current) {
        setState({
          profile: session.profile,
          token: session.token,
          expiresAt: session.expiresAt,
          loading: false,
        });
      }
      // Revalida em background — o cache serve so para nao piscar.
      void refreshProfile();
    })();
    // Roda uma vez: refreshProfile e estavel via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const plan = (state.profile?.plan ?? 'free') as Plan;

    const restante = state.expiresAt ? state.expiresAt - Date.now() : null;
    const diasParaExpirar =
      restante !== null && restante > 0 && restante < AVISO_EXPIRACAO_MS
        ? Math.max(1, Math.ceil(restante / 86_400_000))
        : null;

    return {
      ...state,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
      isSupporter: plan === 'supporter',
      diasParaExpirar,
    };
  }, [state, signIn, signOut, updateProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return ctx;
}
