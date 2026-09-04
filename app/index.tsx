/**
 * Alvo de "/" (feith:///), sem o qual o Expo Router mostra "Unmatched Route"
 * na abertura do app: nenhum outro arquivo cobre a raiz, so grupos como
 * (tabs) e (auth), que nao respondem por "/". O redirecionamento de verdade
 * (login, onboarding, hoje) e feito pelo RouteGuard em `_layout.tsx`.
 *
 * Ela mostra um indicador, e nao `null`. Renderizar nada aqui significava que
 * qualquer falha do guard em tirar a pessoa desta rota virava uma tela branca
 * sem explicacao — foi assim que a sessao persistida ficou em branco por um
 * ramo faltando no guard. Com o indicador, o mesmo defeito apareceria como
 * "carregando para sempre": ainda um bug, mas um que se enxerga.
 */
import { View } from 'react-native';

import { Loading, scheme } from '../src/components/ui';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <Loading />
    </View>
  );
}
