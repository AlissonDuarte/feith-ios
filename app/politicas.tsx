import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, scheme } from '../src/components/ui';

/**
 * Politica de privacidade.
 *
 * Precisa ser alcancavel SEM sessao (por isso fica fora do guard): a App
 * Review abre esta tela, e o link tambem aparece no paywall, onde e exigencia
 * da diretriz 3.1.2.
 *
 * O conteudo espelha front_fide/src/routes/policies/+page.svelte.
 */
export default function Politicas() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 64, gap: 12 }}>
        <Text variant="display" display weight="bold">
          Privacidade
        </Text>
        <Text variant="body" color={scheme.textSecondary}>
          Conteúdo a portar de front_fide/src/routes/policies. Precisa estar completo antes da
          submissão.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
