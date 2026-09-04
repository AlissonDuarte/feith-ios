/**
 * Alvo de "/" (feith:///), sem o qual o Expo Router mostra "Unmatched Route"
 * na abertura do app: nenhum arquivo aqui cobre a raiz, so grupos como
 * (tabs) e (auth), que nao respondem por "/". O redirecionamento de verdade
 * (login, onboarding, hoje) e feito pelo RouteGuard em `_layout.tsx`; esta
 * tela so precisa existir para a raiz ter uma rota para montar.
 */
export default function Index() {
  return null;
}
