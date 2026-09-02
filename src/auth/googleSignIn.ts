/**
 * Login com o Google.
 *
 * A web faz redirect de pagina inteira: pede a auth URL ao backend, guarda o
 * `state` em sessionStorage, manda o navegador para o Google e volta em
 * /callback com um `code` (login/+page.svelte:45-62). Nada disso serve num app
 * — aqui o modulo nativo abre a folha do sistema e devolve um ID token direto,
 * que o backend valida contra o JWKS do Google.
 *
 * O botao so aparece quando os dois client IDs existem. Dentro do app isso e o
 * certo: melhor nenhum botao do que um que so falharia ao ser tocado. Numa
 * build de release e o oposto, e por isso o ios.yml quebra quando o secret
 * falta — senao sairia um TestFlight sem login social e sem erro no log.
 *
 * O modulo e NATIVO: nao funciona no Expo Go. Use o development build.
 */
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** Lido pela tela de login para decidir se mostra o botao. */
export const googleSignInAvailable = Boolean(webClientId && iosClientId);

export class GoogleSignInError extends Error {}

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({
    // O backend valida o `aud` do token. Ele muda conforme a origem: o site
    // manda o client web e o app manda o client iOS, e por isso o backend
    // precisa aceitar OS DOIS como audiencia (item B4 do plano).
    webClientId,
    iosClientId,
  });
  configured = true;
}

/**
 * Abre o fluxo nativo e devolve o ID token para o backend.
 *
 * @returns o token, ou `null` se o usuario cancelou — cancelar nao e erro e
 *   nao deve virar mensagem vermelha na tela.
 */
export async function signInWithGoogle(): Promise<string | null> {
  if (!googleSignInAvailable) {
    throw new GoogleSignInError('Login com o Google não está configurado nesta versão.');
  }

  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') return null;

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new GoogleSignInError('O Google não devolveu um token de identidade.');
    }
    return idToken;
  } catch (e) {
    if (e instanceof GoogleSignInError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    throw new GoogleSignInError('Não foi possível entrar com o Google.');
  }
}

/**
 * Chamado no logout. Sem isto o SDK guarda a conta escolhida e o proximo toque
 * no botao reentra sem perguntar — ruim para quem deslogou justamente para
 * trocar de conta.
 */
export async function signOutFromGoogle(): Promise<void> {
  if (!googleSignInAvailable || !configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nao pode travar o logout.
  }
}
