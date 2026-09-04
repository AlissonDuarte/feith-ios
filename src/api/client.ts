/**
 * Client HTTP do feith.
 *
 * A web (front_fide) nao tem camada de API: cada componente Svelte chama
 * fetch() inline com o objeto de options repetido a mao, e trata erro do seu
 * jeito. Aqui existe um lugar so, e ele carrega o que a web nao carrega:
 *
 *   1. Bearer em vez de cookie httpOnly. O backend hoje so le cookie
 *      (auth_service.py:81); o item B1 do plano adiciona o header. `fetch`
 *      nativo nao seta cookie httpOnly, entao isso e pre-requisito.
 *   2. 401 desloga e navega, em vez de mostrar um toast e deixar o usuario
 *      preso numa tela vazia (que e o que a web faz hoje).
 *   3. Erro vira ApiError com mensagem JA em pt-BR (ver errors.ts) — o backend
 *      responde em ingles.
 *
 * E mais tres defesas contra particularidades do backend, comentadas no lugar
 * onde acontecem: os dois endpoints que mentem no codigo HTTP, o envelope de
 * paginacao que falta um campo, e as datas que nao sao ISO.
 */
import { parseDateBR, parseDateTimeBR, parseExpiresBR } from './dates';
import { mensagemDeErro } from './errors';
import {
  ApiError,
  type AppleProfile,
  type AuthResponse,
  type BookmarkItem,
  type BookmarkToggleResponse,
  type ErrorPayload,
  type HistoryItem,
  type LoginPayload,
  type NoteItem,
  type Page,
  type RawPage,
  type Reflection,
  type ReflectionNote,
  type RegisterPayload,
  type SharedLink,
  type SharedLinkResponse,
  type SharedReflection,
  type Streak,
  type SubscriptionStatus,
  type Transcript,
  type TranscriptResponse,
  type UserProfile,
  type UserSummary,
} from './types';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000/api';

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || 'https://feith.space').replace(/\/$/, '');

// ── Estado de sessao em memoria ──────────────────────────────────────────────
// Mantido fora do React para o client ser chamavel de qualquer lugar sem
// prop-drilling. O AuthContext e a unica fonte que escreve aqui.

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(access: string | null): void {
  accessToken = access;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// ── Nucleo ───────────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Nao desloga no 401. Usado nos endpoints publicos (/shorts/r, login). */
  allowAnonymous?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!query) return `${BASE_URL}${path}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, allowAnonymous, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // O backend so devolve o token no corpo quando ve este header; sem ele a
    // resposta de login vem apenas com o Set-Cookie, que nao serve aqui.
    // Ver item B2 do plano.
    'X-Client-Platform': 'ios',
    ...((extraHeaders as Record<string, string>) || {}),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // Falha de rede nao tem status. Status 0 e a convencao interna para isso.
    throw new ApiError(0, null, path, mensagemDeErro(0, null, path));
  }

  const data = (await response.json().catch(() => null)) as ErrorPayload;

  if (response.status === 401 && !allowAnonymous) {
    // Nao ha refresh no backend hoje (item B3 do plano): 401 e terminal.
    // Quando /users/refresh existir, e aqui que entra a renovacao antes de
    // desistir da sessao.
    onUnauthorized?.();
    throw new ApiError(401, data, path, mensagemDeErro(401, data, path));
  }

  if (!response.ok) {
    throw new ApiError(response.status, data, path, mensagemDeErro(response.status, data, path));
  }

  return data as T;
}

function publicRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, allowAnonymous: true });
}

/**
 * Rede de seguranca para os endpoints de nota.
 *
 * Eles respondiam HTTP 200 com `{status: false}` quando falhavam — o codigo
 * HTTP mentia. O backend ja foi corrigido para devolver 400/404, mas a
 * checagem fica: ela custa nada e cobre o intervalo em que uma versao do app
 * esteja no ar contra um backend ainda nao atualizado.
 */
function assertStatus<T extends { status: boolean; message: string }>(
  path: string,
): (res: T) => T {
  return (res) => {
    if (res && res.status === false) {
      throw new ApiError(400, { detail: res.message }, path, 'Não foi possível salvar sua anotação.');
    }
    return res;
  };
}

/**
 * Normaliza o envelope de paginacao.
 *
 * `/histories/general` e o unico que nao devolve `total_pages`
 * (history_schemas.py:23) — a web trata isso caindo para 1 em silencio, o que
 * quebra a paginacao. Aqui o valor e calculado quando falta.
 */
function normalizePage<R, T>(raw: RawPage<R>, map: (item: R) => T): Page<T> {
  const pageSize = raw.page_size || 10;
  const totalPages = raw.total_pages ?? Math.max(1, Math.ceil((raw.total || 0) / pageSize));
  return {
    items: (raw.items || []).map(map),
    total: raw.total || 0,
    page: raw.page || 1,
    pageSize,
    totalPages,
    hasNextPage: (raw.page || 1) < totalPages,
  };
}

// ── Hidratacao de datas ──────────────────────────────────────────────────────
// Feita aqui, na fronteira, para que nenhuma tela precise saber que o backend
// manda "dd/mm/aaaa" em vez de ISO.

const hydrateReflection = (r: Reflection): Reflection => ({
  ...r,
  publishAt: parseDateBR(r.publish_at),
});

const hydrateBookmark = (b: BookmarkItem): BookmarkItem => ({
  ...b,
  createdAt: parseDateTimeBR(b.created_at),
});

const hydrateHistory = (h: HistoryItem): HistoryItem => ({
  ...h,
  publishAt: parseDateBR(h.publish_at),
});

const hydrateNote = (n: NoteItem): NoteItem => ({
  ...n,
  createdAt: parseDateTimeBR(n.created_at),
});

const hydrateReflectionNote = (n: ReflectionNote): ReflectionNote => ({
  ...n,
  createdAt: parseDateTimeBR(n.created_at),
});

interface PageQuery {
  page?: number;
  page_size?: number;
  search?: string;
}

// ── Superficie da API ────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: (body: RegisterPayload) =>
    publicRequest<{ message: string; created: boolean }>('/users/register', {
      method: 'POST',
      body,
    }),

  login: (body: LoginPayload) =>
    publicRequest<AuthResponse>('/users/login', { method: 'POST', body }),

  /** `idToken` e o ID token do Google, vindo do modulo nativo. */
  googleLogin: (idToken: string) =>
    publicRequest<AuthResponse>('/users/google-login/native', {
      method: 'POST',
      body: { id_token: idToken },
    }),

  /**
   * `identityToken` e o JWT da Apple. O `profile` vai junto porque nome e
   * e-mail so existem na primeira autorizacao — depois disso a Apple manda
   * apenas o `sub` e o backend nao teria de onde tirar.
   */
  appleLogin: (identityToken: string, profile: AppleProfile) =>
    publicRequest<AuthResponse>('/users/apple-login', {
      method: 'POST',
      body: { identity_token: identityToken, ...profile },
    }),

  /**
   * So invalida o cookie no servidor (user_views.py:57), o que e no-op para
   * Bearer. Chamado por simetria; o logout de verdade e local.
   */
  logout: () => publicRequest<{ message: string }>('/users/logout', { method: 'POST' }),

  /**
   * Renova o token antes dos 7 dias. Chamado quando o app volta ao primeiro
   * plano e falta pouco para expirar — sem isto a sessao morre no meio da
   * leitura, sem aviso.
   */
  refresh: () => request<AuthResponse>('/users/refresh', { method: 'POST' }),

  /**
   * Exclusao de conta. `password` e obrigatoria para quem entrou por e-mail;
   * contas de Google ou Apple nao tem senha e o token ja e a reautenticacao.
   */
  deleteAccount: (password?: string) =>
    request<{ deleted: boolean; message: string }>('/users/me', {
      method: 'DELETE',
      body: { password: password ?? null },
    }),

  // Perfil
  /**
   * Perfil, streak e quotas de uma vez. Preferir a /users/profile: a web pede
   * perfil e streak separadamente em cada tela, e esta rota existe para o app
   * nao repetir isso.
   */
  getSummary: () => request<UserSummary>('/users/me/summary'),

  getProfile: () => request<UserProfile>('/users/profile'),

  /** Devolve o perfil completo e atualizado — da para gravar sem refetch. */
  updateProfile: (patch: Partial<UserProfile>) =>
    request<UserProfile>('/users/profile/update', { method: 'PATCH', body: patch }),

  completeOnboarding: () =>
    request<{ completed: boolean }>('/users/onboarding/complete', { method: 'POST' }),

  // Reflexao
  /**
   * ATENCAO: este GET tem efeito colateral — registra a leitura de hoje
   * (reflection_views.py:37), que e o que alimenta o streak. Depois de chamar,
   * recarregue o streak, senao o contador atrasa um dia.
   *
   * E quando nao ha reflexao publicada, devolve todos os campos vazios com
   * uuid: "" em vez de 404. Trate `uuid === ''` como "sem conteudo hoje".
   */
  getDailyReflection: () =>
    request<Reflection>('/reflections/daily').then(hydrateReflection),

  getReflection: (reflectionUuid: string) =>
    request<Reflection>('/reflections/daily', {
      query: { ref_key: reflectionUuid },
    }).then(hydrateReflection),

  /** GET alterna o favorito; DELETE remove. Mesmo path, semanticas diferentes. */
  toggleBookmark: (reflectionUuid: string) =>
    request<BookmarkToggleResponse>('/reflections/bookmark', {
      query: { ref_key: reflectionUuid },
    }),

  removeBookmark: (reflectionUuid: string) =>
    request<BookmarkToggleResponse>('/reflections/bookmark', {
      method: 'DELETE',
      query: { ref_key: reflectionUuid },
    }),

  getBookmarks: (q: PageQuery = {}) =>
    request<RawPage<BookmarkItem>>('/reflections/bookmarks', { query: { ...q } }).then((raw) =>
      normalizePage(raw, hydrateBookmark),
    ),

  getHistory: (q: PageQuery = {}) =>
    request<RawPage<HistoryItem>>('/histories/general', { query: { ...q } }).then((raw) =>
      normalizePage(raw, hydrateHistory),
    ),

  // Anotacoes
  createNote: (reflectionUuid: string, note: string) =>
    request<{ status: boolean; message: string }>('/user_notes/create', {
      method: 'POST',
      body: { reflection_uuid: reflectionUuid, note, public: false },
    }).then(assertStatus('/user_notes/create')),

  getNotes: (q: PageQuery = {}) =>
    request<RawPage<NoteItem>>('/user_notes/list', { query: { ...q } }).then((raw) =>
      normalizePage(raw, hydrateNote),
    ),

  getReflectionNotes: (reflectionUuid: string, q: PageQuery = {}) =>
    request<RawPage<ReflectionNote>>('/user_notes/reflection/notes', {
      query: { ref_key: reflectionUuid, ...q },
    }).then((raw) => normalizePage(raw, hydrateReflectionNote)),

  updateNote: (noteUuid: string, note: string, isPublic = false) =>
    request<{ status: boolean; message: string }>('/user_notes/update', {
      method: 'PATCH',
      body: { note_uuid: noteUuid, note, public: isPublic },
    }).then(assertStatus('/user_notes/update')),

  /** DELETE com corpo JSON — incomum, mas e o que o backend espera. */
  deleteNote: (noteUuid: string, reflectionUuid: string) =>
    request<{ status: boolean; message: string }>('/user_notes/delete', {
      method: 'DELETE',
      body: { note_uuid: noteUuid, reflection_uuid: reflectionUuid },
    }).then(assertStatus('/user_notes/delete')),

  // Streak
  getStreak: () => request<Streak>('/streaks/me'),

  // Audio — exclusivo de apoiador (401/402/403 para os demais)
  /**
   * `issuedAt` e carimbado aqui porque a URL assinada do CloudFront vale 60
   * minutos (transcription_service.py:33). Quem toca o audio usa esse carimbo
   * para renovar antes de expirar — ver src/player/.
   */
  getTranscript: async (reflectionUuid: string): Promise<Transcript> => {
    const raw = await request<TranscriptResponse>('/transcriptions/transcript', {
      query: { ref_key: reflectionUuid },
    });
    return {
      // `title` e o campo correto; `tittle` e o typo original, mantido no
      // backend porque a web ja depende dele.
      title: raw.title || raw.tittle || 'Leitura do dia',
      subtitle: raw.subtitle,
      audioUrl: raw.audio_url,
      issuedAt: Date.now(),
    };
  },

  // Compartilhamento
  /**
   * A URL pronta vem do servidor (`share_url`), para o dominio viver num lugar
   * so — o mesmo que os Universal Links usam. O fallback monta localmente,
   * porque um backend ainda nao atualizado devolve apenas o token.
   */
  createShareLink: async (reflectionUuid: string): Promise<SharedLink> => {
    const raw = await request<SharedLinkResponse>(`/shorts/create/${reflectionUuid}`);
    return {
      token: raw.short_link,
      url: raw.share_url || `${WEB_URL}/r/${raw.short_link}`,
      maxReads: raw.max_reads,
      expiresAt: parseExpiresBR(raw.expires_at),
    };
  },

  /** Publico: funciona deslogado, e um 401 aqui nao pode derrubar a sessao. */
  getSharedReflection: (token: string) =>
    publicRequest<SharedReflection>(`/shorts/r/${token}`).then((r) => ({
      ...r,
      publishAt: parseDateBR(r.publish_at),
    })),

  // Assinatura
  getSubscriptionStatus: () => request<SubscriptionStatus>('/subscriptions/status'),

  /**
   * Envia a transacao assinada do StoreKit para o backend validar contra a
   * cadeia de certificados da Apple. So depois do 200 o app pode chamar
   * finishTransaction — finalizar antes tira a transacao da fila da Apple e,
   * se esta chamada falhar, o usuario pagou sem receber acesso.
   */
  verifyAppleTransaction: (jws: string) =>
    request<SubscriptionStatus>('/subscriptions/apple/verify', {
      method: 'POST',
      body: { jws },
    }),

  // Push
  registerDeviceToken: (token: string, environment: 'sandbox' | 'production') =>
    request<unknown>('/push/device', {
      method: 'POST',
      body: { token, platform: 'ios', environment },
    }),

  unregisterDeviceToken: (token: string) =>
    request<unknown>('/push/device', { method: 'DELETE', body: { token } }),
};

export { BASE_URL, WEB_URL };
