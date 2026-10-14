import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hairline, RowGroup, Text } from '../../src/components/ui';
import { type ModoTema, useTheme } from '../../src/theme/ThemeContext';
import { space } from '../../src/theme/tokens';

const OPCOES: { modo: ModoTema; icone: keyof typeof Ionicons.glyphMap; rotulo: string; descricao: string }[] = [
  {
    modo: 'system',
    icone: 'phone-portrait-outline',
    rotulo: 'Sistema',
    descricao: 'Acompanha o modo claro ou escuro do aparelho.',
  },
  { modo: 'light', icone: 'sunny-outline', rotulo: 'Claro', descricao: 'Sempre claro, mesmo com o aparelho no escuro.' },
  { modo: 'dark', icone: 'moon-outline', rotulo: 'Escuro', descricao: 'Sempre escuro, mesmo com o aparelho no claro.' },
];

function LinhaOpcao({
  icone,
  rotulo,
  descricao,
  selecionado,
  onPress,
  ultimo,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  descricao: string;
  selecionado: boolean;
  onPress: () => void;
  ultimo?: boolean;
}) {
  const { scheme } = useTheme();
  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selecionado }}
        accessibilityLabel={rotulo}
        style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: scheme.canvasWarm }]}
      >
        <View
          style={[
            estilos.iconBadge,
            { backgroundColor: selecionado ? scheme.goldSubtle : scheme.canvasWarm },
          ]}
        >
          <Ionicons name={icone} size={17} color={selecionado ? scheme.gold : scheme.textSecondary} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text variant="body" font="bodyMedium">
            {rotulo}
          </Text>
          <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 2 }}>
            {descricao}
          </Text>
        </View>
        <Ionicons
          name={selecionado ? 'checkmark-circle' : 'ellipse-outline'}
          size={21}
          color={selecionado ? scheme.gold : scheme.border}
        />
      </Pressable>
      {ultimo ? null : <Hairline inset={62} />}
    </>
  );
}

export default function Aparencia() {
  const { scheme, mode, setMode } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        <RowGroup titulo="Tema">
          {OPCOES.map((opcao, i) => (
            <LinhaOpcao
              key={opcao.modo}
              icone={opcao.icone}
              rotulo={opcao.rotulo}
              descricao={opcao.descricao}
              selecionado={mode === opcao.modo}
              onPress={() => setMode(opcao.modo)}
              ultimo={i === OPCOES.length - 1}
            />
          ))}
        </RowGroup>

        <Text variant="caption" color={scheme.textGhost}>
          Alertas e teclado do sistema continuam seguindo o aparelho — só o conteúdo do feith muda
          com essa escolha.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
