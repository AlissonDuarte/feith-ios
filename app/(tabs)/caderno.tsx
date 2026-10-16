import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Anotacoes } from '../../src/caderno/Anotacoes';
import { Favoritos } from '../../src/caderno/Favoritos';
import { Text } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { useTheme } from '../../src/theme/ThemeContext';
import { radius, space } from '../../src/theme/tokens';

type Aba = 'anotacoes' | 'favoritos';

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'anotacoes', rotulo: 'Anotações' },
  { valor: 'favoritos', rotulo: 'Favoritos' },
];

export default function Caderno() {
  const { scheme } = useTheme();
  const [aba, setAba] = useState<Aba>('anotacoes');

  const seletor = (
    <View style={[estilos.seletor, { backgroundColor: scheme.canvasWarm, borderColor: scheme.border }]} accessibilityRole="tablist">
      {ABAS.map((a) => {
        const ativa = a.valor === aba;
        return (
          <Pressable
            key={a.valor}
            onPress={() => {
              setAba(a.valor);
              posthog?.capture('caderno_tab_selected', { tab: a.valor });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativa }}
            style={[estilos.opcao, ativa && { backgroundColor: scheme.surface, borderColor: scheme.border }]}
          >
            <Text variant="micro" font={ativa ? 'bodySemi' : 'bodyMedium'} color={ativa ? scheme.accent : scheme.textSecondary}>
              {a.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      {aba === 'anotacoes' ? <Anotacoes seletor={seletor} /> : <Favoritos seletor={seletor} />}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  seletor: {
    flexDirection: 'row',
    marginHorizontal: space.gutter,
    marginTop: space.lg,
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  opcao: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
});
