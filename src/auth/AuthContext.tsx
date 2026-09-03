/**
 * Estado de autenticacao e de sessao.
 *
 * A web nao tem equivalente: `front_fide` nao possui store de auth nem guard de
 * rota — cada pagina /user/** renderiza e deixa os fetches falharem, e um 401
 * vira um toast que nao leva a lugar nenhum. Aqui a sessao e um estado unico e
 * o guard vive em app/_layout.tsx.
 *
 * O contexto carrega o SUMMARY (plano, streak, quotas, onboarding) e nao o
 * perfil completo. Sao dados que quase toda tela precisa, e a rota
 * /users/me/summary traz os tres numa requisicao — a web pede perfil e streak
 * separadamente em cada navegacao. O perfil completo (data de nascimento,
 * genero) e assunto so da tela de editar perfil, que o busca sozinha.
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
import { AppState, type AppStateStatus } from 'react-native';

import { api, setToken, setUnauthorizedHandler } from '../api/client';
import type { AuthResponse, Plan, UserSummary } from '../api/types';
import { signOutFromGoogle } from './googleSignIn';
import { unregisterFromPush } from '../push/registerDevice';
import { clearSession, jwtExpiresAt, loadSession, saveSummary, saveToken } from './tokenStore';

/**
 * A partir de quanto tempo restante o app tenta renovar o token.
 *
 * O JWT dura 7 dias. Renovar no foreground quando faltam menos de 48h torna a
 * janela deslizante: quem abre o app ao menos uma vez por semana nunca mais
 * digita a senha. Sem isso, todo usuario e deslogado a cada 7 dias, no meio do
 * que estiver fazendo.
 */
const LIMIAR_RENOVACAO_MS = 2 * 24 * 60 * 60 * 1000;

interface AuthState {
  summary: UserSummary | null;
  token: string | null;
  expiresAt: number | null;
  /** true ate a sessao persistida carregar — evita piscar a tela de login. */
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  /** `plan === 'supporter'`. Fonte unica de entitlement no app. */
  isSupporter: boolean;
  /** Dias ate a sessao expirar quando ja esta perto; null caso contrario. */
  diasParaExpirar: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    summary: null,
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
    await api.logout().catch(() => undefined);

    setToken(null);
    await clearSession();
    // Sem isto o SDK do Google guarda a conta e o proximo toque no botao
    // reentra sem perguntar — ruim para quem deslogou para trocar de conta.
    await signOutFromGoogle();

    if (mounted.current) {
      setState({ summary: null, token: null, expiresAt: null, loading: false });
    }
  }, []);

  const aplicarToken = useCallback(async (token: string, expiresIn?: number) => {
    setToken(token);
    await saveToken(token);
    const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : jwtExpiresAt(token);
    if (mounted.current) {
      setState((s) => ({ ...s, token, expiresAt }));
    }
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const summary = await api.getSummary();
      await saveSummary(summary);
      if (mounted.current) {
        setState((s) => ({ ...s, summary }));
      }
    } catch {
      // Offline ou token morto: segue com o cache. Se o token estiver mesmo
      // invalido, o handler de 401 desloga.
    }
  }, []);

  const signIn = useCallback(
    async (response: AuthResponse) => {
      await aplicarToken(response.access_token, response.expires_in);
      await refreshSummary();
      if (mounted.current) {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [aplicarToken, refreshSummary],
  );

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
          setState({ summary: null, token: null, expiresAt: null, loading: false });
        }
        return;
      }

      setToken(session.token);
      if (mounted.current) {
        setState({
          summary: session.summary,
          token: session.token,
          expiresAt: session.expiresAt,
          loading: false,
        });
      }
      // Revalida em background — o cache serve so para nao piscar.
      void refreshSummary();
    })();
    // Roda uma vez: refreshSummary e estavel via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renovacao no foreground. Um app de habito diario e aberto quase todo dia,
  // entao na pratica a sessao nunca expira.
  useEffect(() => {
    const aoVoltar = async (status: AppStateStatus) => {
      if (status !== 'active') return;
      if (!state.token || !state.expiresAt) return;

      const restante = state.expiresAt - Date.now();
      if (restante <= 0 || restante > LIMIAR_RENOVACAO_MS) return;

      try {
        const novo = await api.refresh();
        await aplicarToken(novo.access_token, novo.expires_in);
      } catch {
        // Renovacao e best-effort: se falhar, o token atual ainda vale ate
        // expirar, e o 401 desloga limpo quando chegar a hora.
      }
    };

    const sub = AppState.addEventListener('change', aoVoltar);
    // Tambem na montagem: o app pode ter sido aberto do zero ja perto do prazo.
    void aoVoltar(AppState.currentState);
    return () => sub.remove();
  }, [state.token, state.expiresAt, aplicarToken]);

  const value = useMemo<AuthContextValue>(() => {
    const plan = (state.summary?.plan ?? 'free') as Plan;

    const restante = state.expiresAt ? state.expiresAt - Date.now() : null;
    const diasParaExpirar =
      restante !== null && restante > 0 && restante < LIMIAR_RENOVACAO_MS
        ? Math.max(1, Math.ceil(restante / 86_400_000))
        : null;

    return {
      ...state,
      signIn,
      signOut,
      refreshSummary,
      isSupporter: plan === 'supporter',
      diasParaExpirar,
    };
  }, [state, signIn, signOut, refreshSummary]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return ctx;
}
