/**
 * Ornamentos da identidade editorial.
 *
 * O que a landing repete de secao em secao e que nenhum primitivo de UI
 * entrega: o halo atras do bloco de abertura, as aspas grandes da citacao, o
 * numeral serifado das etapas e o colofao que fecha a leitura.
 *
 * O fio de ouro mora em `ui.tsx` e nao aqui: ele e estrutural — todo cabecalho
 * de tela usa — enquanto estes sao decorativos.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { fonts, schemes, space } from '../theme/tokens';
import { Text } from './ui';

const scheme = schemes.light;

/**
 * Halo radial de oxblood atras do bloco de abertura.
 *
 * E o `radial-gradient(circle at 50% 40%, rgba(122,31,31,0.06), transparent)`
 * do hero da landing. Absoluto e sem area de toque: e atmosfera, nunca um
 * alvo.
 */
export function AccentHalo({ height = 320, opacity = 1 }: { height?: number; opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height, opacity }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="halo" cx="50" cy="34" rx="62" ry="58" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={scheme.accent} stopOpacity={0.07} />
            <Stop offset="1" stopColor={scheme.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#halo)" />
      </Svg>
    </View>
  );
}

/**
 * Aspa de abertura da citacao — o `.quote-mark` da landing.
 *
 * Oxblood a 14% num corpo enorme: e ornamento tipografico, nao pontuacao. Por
 * isso fica escondido do leitor de tela — anunciar "aspas" antes do versiculo
 * so atrapalha.
 */
export function QuoteMark({ size = 64, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ height: size * 0.4, overflow: 'hidden' }, style]}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: size,
          lineHeight: size * 0.82,
          color: scheme.accent,
          opacity: 0.14,
        }}
      >
        “
      </Text>
    </View>
  );
}

/**
 * Numeral de secao: algarismo em italico serifado dentro de um circulo de fio
 * dourado. E o `w-8 h-8 rounded-full border border-amber-200 font-serif italic`
 * do TextReader da web, com o ambar trocado pelo ouro da marca.
 */
export function SectionNumeral({ n, size = 34 }: { n: number; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: scheme.goldSoft,
        backgroundColor: scheme.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.serifItalic,
          fontSize: size * 0.5,
          lineHeight: size * 0.64,
          color: scheme.gold,
        }}
      >
        {n}
      </Text>
    </View>
  );
}

/**
 * Marca de fim de leitura. Fecha o texto em vez de deixa-lo simplesmente
 * parar — o equivalente ao colofao de um livro impresso.
 */
export function EndMark({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: 'center', paddingTop: space.section }, style]}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          fontFamily: fonts.serif,
          fontSize: 18,
          lineHeight: 24,
          color: scheme.goldSoft,
          letterSpacing: 6,
        }}
      >
        ❦
      </Text>
    </View>
  );
}
