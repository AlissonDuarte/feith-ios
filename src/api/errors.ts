/**
 * Traducao de erro do backend para pt-BR.
 *
 * O backend responde `detail` em INGLES em toda a API, enquanto o app inteiro
 * e pt-BR. Nenhuma dessas strings pode chegar a tela: elas sao chave de
 * traducao, nao mensagem.
 *
 * A resolucao segue esta ordem, do mais confiavel para o menos:
 *   1. `detail` exato conhecido  — ha 38 deles no backend, os que importam
 *                                  para o app estao mapeados abaixo;
 *   2. status + caminho          — desambigua os 429 e 403, que significam
 *                                  coisas diferentes por endpoint;
 *   3. status sozinho            — rede de seguranca.
 *
 * Quando o backend ganhar o campo `code` (item B12 do plano), o passo 1 passa a
 * casar por code e para de depender de string em ingles.
 */
import { ApiError, type ErrorPayload, type ValidationDetail } from './types';

/** Extrai o texto cru de `detail`, que pode ser string ou array (422). */
export function rawDetail(data: ErrorPayload): string | null {
  if (!data || typeof data !== 'object') return null;
  const detail = (data as { detail?: string | ValidationDetail[] }).detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0]?.msg ?? null;
  }
  return null;
}

/**
 * Mensagens exatas do backend que valem uma traducao propria.
 * Fonte: grep de `detail=` em fide-backend/.
 */
const POR_DETALHE: Record<string, string> = {
  // Autenticacao
  'Not authenticated': 'Sua sessão expirou. Entre novamente.',
  'Invalid or expired token': 'Sua sessão expirou. Entre novamente.',
  'Invalid token': 'Sua sessão expirou. Entre novamente.',
  'Invalid user': 'Sua sessão expirou. Entre novamente.',
  'Invalid password': 'E-mail ou senha incorretos.',
  'User not found': 'E-mail ou senha incorretos.',
  'User already exists with this email or username':
    'Já existe uma conta com este e-mail ou nome de usuário.',

  // Senha — o backend valida e o app espelha as regras antes de enviar,
  // mas se passar, a mensagem precisa fazer sentido.
  "Passwords don't match": 'As senhas não conferem.',
  'Password must be at least 8 characters long':
    'A senha precisa ter pelo menos 8 caracteres.',
  'Password must contain at least one uppercase letter':
    'A senha precisa ter pelo menos uma letra maiúscula.',
  'Password must contain at least one lowercase letter':
    'A senha precisa ter pelo menos uma letra minúscula.',
  'Password must contain at least one number':
    'A senha precisa ter pelo menos um número.',
  'Password must contain at least one special character':
    'A senha precisa ter pelo menos um caractere especial (!@#$%^&*()_+).',

  // Plano e assinatura
  'Not subscribed': 'Este recurso é exclusivo para apoiadores.',
  'Not a supporter member': 'Este recurso é exclusivo para apoiadores.',
  'Subscription not active': 'Sua assinatura não está ativa.',
  'Subscription not found': 'Não encontramos uma assinatura para esta conta.',
  'Daily reflection not available':
    'Reflexões com mais de 7 dias são exclusivas para apoiadores.',

  // Conteudo
  'Reflection not found': 'Reflexão não encontrada.',
  'Reflection not found to this user': 'Reflexão não encontrada.',

  // Link compartilhado
  'Shared link not found': 'Link não encontrado.',
  'Shared link is expired or revoked': 'Este link expirou.',
  'Shared link read limit exceeded': 'Este link já atingiu o limite de leituras.',
};

/**
 * `"Limit exceeded"` e devolvido com 429 por DOIS caminhos diferentes com
 * limites diferentes — favoritos (reflection_service.py:98) e anotacoes
 * (user_note_service.py:52). So o caminho distingue.
 */
function porStatusECaminho(status: number, path: string): string | null {
  if (status === 429) {
    if (path.includes('/reflections/bookmark')) {
      return 'Você atingiu o limite de favoritos do plano gratuito.';
    }
    if (path.includes('/user_notes')) {
      return 'Você atingiu o limite de anotações deste mês.';
    }
    if (path.includes('/shorts/r/')) {
      return 'Este link já atingiu o limite de leituras.';
    }
    return 'Você atingiu um limite do plano gratuito.';
  }

  if (status === 403) {
    if (path.includes('/transcriptions/transcript')) {
      return 'O áudio é exclusivo para apoiadores.';
    }
    if (path.includes('/reflections/daily')) {
      return 'Reflexões com mais de 7 dias são exclusivas para apoiadores.';
    }
  }

  if (status === 410) return 'Este link expirou.';

  return null;
}

function porStatus(status: number): string {
  if (status === 0) return 'Não foi possível conectar. Verifique sua internet.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 402) return 'Sua assinatura não está ativa.';
  if (status === 403) return 'Você não tem acesso a este conteúdo.';
  if (status === 404) return 'Não encontramos o que você procura.';
  if (status === 409) return 'Esta operação conflita com algo que já existe.';
  if (status === 422) return 'Confira os dados e tente de novo.';
  if (status === 429) return 'Você atingiu um limite do plano gratuito.';
  if (status >= 500) return 'Algo deu errado do nosso lado. Tente novamente.';
  return 'Algo deu errado. Tente novamente.';
}

/** A mensagem que vai para a tela. Nunca devolve texto em ingles. */
export function mensagemDeErro(status: number, data: ErrorPayload, path: string): string {
  const detail = rawDetail(data);
  if (detail && POR_DETALHE[detail]) return POR_DETALHE[detail];

  const porCaminho = porStatusECaminho(status, path);
  if (porCaminho) return porCaminho;

  return porStatus(status);
}

/** Conveniencia para telas: pega qualquer throw e devolve algo exibivel. */
export function mensagemDe(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message;
  return 'Algo deu errado. Tente novamente.';
}

/**
 * O erro veio de quota do plano free? E o gatilho do paywall.
 *
 * 402 e 403 de assinatura tambem contam: sao "voce precisa ser apoiador",
 * enquanto um 403 de outra origem e so falta de acesso.
 */
export function ehLimiteDePlano(erro: unknown): boolean {
  if (!(erro instanceof ApiError)) return false;
  if (erro.status === 429) return true;
  if (erro.status === 402) return true;
  if (erro.status === 403) {
    const detail = rawDetail(erro.data);
    return (
      detail === 'Not a supporter member' ||
      detail === 'Not subscribed' ||
      detail === 'Daily reflection not available' ||
      erro.path.includes('/transcriptions/transcript')
    );
  }
  return false;
}
