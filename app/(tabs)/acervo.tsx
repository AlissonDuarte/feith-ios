import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Anotacoes } from '../../src/caderno/Anotacoes';
import { Favoritos } from '../../src/caderno/Favoritos';
import { Leituras } from '../../src/caderno/Leituras';
import { Text } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { useTheme } from '../../src/theme/ThemeContext';
import { radius, space } from '../../src/theme/tokens';

type Aba = 'leituras' | 'anotacoes' | 'favoritos';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'leituras', rotulo: 'Leituras' },
  { valor: 'anotacoes', rotulo: 'Anotações' },
  { valor: 'favoritos', rotulo: 'Favoritos' },
];

export default function Acervo() {
  const { scheme } = useTheme();
  const [aba, setAba] = useState<Aba>('leituras');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.md }}>
        <Text variant="display" accessibilityRole="header">
          Acervo
        </Text>
      </View>

      <View style={[estilos.seletor, { backgroundColor: scheme.canvasWarm }]} accessibilityRole="tablist">
        {ABAS.map((a) => {
          const ativa = a.valor === aba;
          return (
            <Pressable
              key={a.valor}
              onPress={() => {
                setAba(a.valor);
                posthog?.capture('acervo_tab_selected', { tab: a.valor });
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              style={[estilos.opcao, ativa && { backgroundColor: scheme.surface }]}
            >
              <Text
                variant="caption"
                font={ativa ? 'bodySemi' : 'bodyMedium'}
                color={ativa ? scheme.textPrimary : scheme.textSecondary}
              >
                {a.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {aba === 'leituras' ? <Leituras /> : aba === 'anotacoes' ? <Anotacoes /> : <Favoritos />}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  seletor: {
    flexDirection: 'row',
    marginHorizontal: space.gutter,
    marginTop: space.md,
    padding: 3,
    borderRadius: radius.sm,
  },
  opcao: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
});
