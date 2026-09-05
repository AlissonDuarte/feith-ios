/**
 * Contrato da API do feith, derivado de fide-backend/api/schemas/*.py.
 *
 * O backend expoe /openapi.json (o FastAPI liga por padrao), mas os schemas de
 * la nao contam as duas coisas que mais mordem aqui: quais campos sao strings
 * de data em formato brasileiro e quais endpoints mentem no codigo HTTP. Este
 * arquivo e a documentacao de fato do contrato — ao mexer num schema do
 * backend, atualize aqui.
 *
 * Convencao: campos que chegam como string formatada mantem o nome do backend
 * e ganham um irmao tipado `Date` com sufixo `At`, produzido em dates.ts.
 */

// ── Erros ────────────────────────────────────────────────────────────────────

/**
 * `detail` do FastAPI vem em duas formas: string (HTTPException) ou array de
 * {loc, msg, type} (erro de validacao 422). Quem trata precisa aguentar as duas.
 */
export interface ValidationDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export type ErrorPayload =
  | { detail?: string | ValidationDetail[] }
  | Record<string, unknown>
  | null;

export class ApiError extends Error {
  readonly status: number;
  readonly data: ErrorPayload;
  /** Caminho chamado, sem o BASE_URL. O mapa pt-BR usa para desambiguar 429. */
  readonly path: string;

  constructor(status: number, data: ErrorPayload, path: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.path = path;
  }
}

// ── Auth e usuario ───────────────────────────────────────────────────────────

export interface AuthResponse {
  message: string;
  /**
   * So chega quando a requisicao manda X-Client-Platform: ios (ver B2 do
   * plano). Na web o backend devolve o token apenas no cookie httpOnly.
   */
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user_uuid: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  /** dd/mm/aaaa. O backend guarda como String, sem validar formato. */
  birth_date: string;
  gender: 'male' | 'female' | 'other';
}

/** Perfil da Apple. Nome e e-mail so existem na PRIMEIRA autorizacao. */
export interface AppleProfile {
  email?: string;
  first_name?: string;
  last_name?: string;
}

export type Plan = 'free' | 'supporter';

/**
 * Dias da semana como o backend espera em notification_schedule.
 * Ver scripts/notification.py:17-25.
 */
export type WeekdayCode = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface NotificationSchedule {
  days: WeekdayCode[];
  /** HH:MM, 24h. */
  time: string;
}

/**
 * GET /users/profile e PATCH /users/profile/update (o PATCH devolve o perfil
 * completo e atualizado, entao da para gravar direto sem refetch).
 *
 * `plan` tem default "usuário comum" no schema Pydantic, mas o service sempre
 * preenche com "free" ou "supporter" (user_service.py:215).
 */
export interface UserProfile {
  username: string;
  email: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other' | '';
  notification_schedule: NotificationSchedule | Record<string, never>;
  is_active: boolean;
  /** Quantidade ja usada — o numerador das quotas do plano free. */
  notes: number;
  bookmarks: number;
  plan: Plan | string;
  onboarding_completed: boolean;
}

// ── Reflexao ─────────────────────────────────────────────────────────────────

/**
 * Os seis blocos de conteudo sao Markdown (a web renderiza com `marked`).
 *
 * ATENCAO: quando nao ha reflexao publicada para hoje, o backend NAO devolve
 * 404 — ele devolve este objeto com todos os campos em string vazia e
 * `uuid: ""` (reflection_service.py:39-51). Trate `uuid === ''` como
 * "sem conteudo hoje", nunca renderize os cards vazios.
 */
export interface Reflection {
  uuid: string;
  scripture_reference: string;
  version: string;
  bible_text: string;
  context: string;
  exegesis: string;
  doctrine: string;
  application: string;
  prayer: string;
  bookmarked: boolean;
  /** dd/mm/aaaa */
  publish_at: string;
  publishAt: Date | null;
}

/** GET /shorts/r/{token} — igual a Reflection, menos uuid e bookmarked. */
export type SharedReflection = Omit<Reflection, 'uuid' | 'bookmarked'>;

export interface BookmarkToggleResponse {
  bookmarked: boolean;
  status: boolean;
  message: string;
}

export interface BookmarkItem {
  reflection_uuid: string;
  scripture_reference: string;
  /** bible_text truncado em 140 caracteres pelo backend. */
  description: string;
  version: string;
  public: boolean;
  notes: number;
  bookmarks: number;
  /** dd/mm/aaaa HH:MM */
  created_at: string;
  createdAt: Date | null;
}

export interface HistoryItem {
  reflection_uuid: string;
  scripture_reference: string;
  version: string;
  /** truncado em 140 caracteres. */
  bible_text: string;
  bookmarked: boolean;
  bookmarks_count: number;
  notes_count: number;
  /** dd/mm/aaaa */
  publish_at: string;
  publishAt: Date | null;
}

// ── Notas ────────────────────────────────────────────────────────────────────

export interface NoteItem {
  reflection_uuid: string;
  reflection_verse: string;
  reflection_verse_text: string;
  note_uuid: string;
  note: string;
  public: boolean;
  /** dd/mm/aaaa HH:MM */
  created_at: string;
  createdAt: Date | null;
}

/** GET /user_notes/reflection/notes — versao enxuta, sem os campos da reflexao. */
export interface ReflectionNote {
  note_uuid: string;
  note: string;
  public: boolean;
  created_at: string;
  createdAt: Date | null;
}

// ── Paginacao ────────────────────────────────────────────────────────────────

/**
 * O envelope cru do backend. `total_pages` existe em bookmarks e notas mas NAO
 * em /histories/general (history_schemas.py:23) — por isso e opcional aqui e o
 * normalizePage() do client calcula quando falta.
 */
export interface RawPage<T> {
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
  items: T[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

// ── Audio ────────────────────────────────────────────────────────────────────

/**
 * `tittle` esta escrito errado no backend (transcript_schemas.py:10) e a web
 * ja depende do typo, entao ele fica. O client normaliza para `title`.
 *
 * `audio_url` e uma URL ASSINADA do CloudFront valida por 60 MINUTOS
 * (transcription_service.py:33). Nao persista: veja src/player/.
 */
export interface TranscriptResponse {
  /** O nome correto. Backends antigos so tem `tittle`. */
  title?: string;
  /** O typo original, mantido porque a web ja depende dele. */
  tittle?: string;
  subtitle: string;
  audio_url: string;
}

export interface Transcript {
  title: string;
  subtitle: string;
  audioUrl: string;
  /** Quando esta URL foi emitida — base do refresh aos 50 min. */
  issuedAt: number;
}

// ── Streak, compartilhamento, assinatura ─────────────────────────────────────

export interface Streak {
  streak: number;
  read_today: boolean;
}

export interface SharedLinkResponse {
  /** Token opaco. */
  short_link: string;
  /**
   * URL pronta, montada pelo servidor a partir de PUBLIC_WEB_URL.
   *
   * Antes cada cliente montava a sua, e o dominio precisa casar com o dos
   * Universal Links. Fica opcional porque um backend mais antigo nao devolve
   * este campo — o client cai para a montagem local nesse caso.
   */
  share_url?: string;
  max_reads: number;
  /** HH:MM:SS dd/mm/aaaa — sim, nesta ordem. */
  expires_at: string;
}

export interface SharedLink {
  token: string;
  url: string;
  maxReads: number;
  expiresAt: Date | null;
}

/**
 * De onde veio a assinatura ativa.
 *
 * O app PRECISA distinguir: uma assinatura feita na web nao se gerencia pela
 * App Store, entao aquela tela mostra apenas o status — sem botao de cancelar
 * e sem link para lugar nenhum. E o oposto de steering: e justamente o que
 * evita oferecer um caminho que levaria para fora do app.
 */
// stripe-ok: valor que o backend devolve, nao um caminho de pagamento no app.
export type SubscriptionProvider = 'stripe' | 'apple' | 'none'; // stripe-ok: idem

export interface SubscriptionStatus {
  has_active_subscription: boolean;
  status: 'active' | 'canceled' | 'pending' | 'none' | string;
  provider?: SubscriptionProvider;
  months_paid?: number;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
}


// ── Summary ──────────────────────────────────────────────────────────────────

export interface UserQuotas {
  bookmarks_used: number;
  bookmarks_limit: number;
  notes_used_month: number;
  notes_limit: number;
}

/**
 * GET /users/me/summary — perfil, streak e quotas numa requisicao so.
 *
 * Os LIMITES vem daqui de proposito, em vez de constantes no app: assim mudar
 * o limite do plano gratuito e editar uma variavel de ambiente no servidor.
 * Se o app os replicasse, mudar um numero exigiria publicar uma versao nova e
 * esperar a App Review.
 */
export interface UserSummary {
  username: string;
  email: string;
  plan: Plan | string;
  provider?: SubscriptionProvider;
  onboarding_completed: boolean;
  streak: number;
  read_today: boolean;
  quotas: UserQuotas;
  /** Quantos dias para tras o plano enxerga. null = sem limite (apoiador). */
  history_window_days: number | null;
  notification_schedule: NotificationSchedule | Record<string, never>;
}
