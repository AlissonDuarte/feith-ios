import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { TrailSummary } from '../api/types';
import { Text } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';

const CAPAS: Record<string, { claro: [string, string]; escuro: [string, string] }> = {
  c1: { claro: ['#E9DDC2', '#CDB17A'], escuro: ['#4A3F2A', '#7A6436'] },
  c2: { claro: ['#DCE3D3', '#9DB08A'], escuro: ['#2F3A2A', '#55684A'] },
  c3: { claro: ['#EFD9C9', '#C99678'], escuro: ['#4A3226', '#7A5340'] },
  c4: { claro: ['#D7DCE6', '#8A9AB5'], escuro: ['#2A3140', '#4D5D7A'] },
  c5: { claro: ['#E8D3D0', '#A9625B'], escuro: ['#45292A', '#76413D'] },
  c6: { claro: ['#E3DCEB', '#9C8DB2'], escuro: ['#352E40', '#5E5173'] },
};

export const COR_PROTESTANTE = '#2C3E5C';
const COR_CATOLICA = '#7A1F1F';

export function CapaTrilha({
  cover,
  style,
  children,
}: {
  cover: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { effectiveMode } = useTheme();
  const capa = CAPAS[cover] ?? CAPAS.c1;
  const [de, ate] = effectiveMode === 'dark' ? capa.escuro : capa.claro;
  const id = `capa-${cover}-${effectiveMode}`;
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={de} />
              <Stop offset="1" stopColor={ate} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}

export function SeloVozes({ tamanho = 20 }: { tamanho?: number }) {
  const bolinha = (cor: string, letra: string, deslocar: boolean) => (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: cor,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: deslocar ? -tamanho * 0.3 : 0,
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: tamanho * 0.45, color: '#FFFFFF', lineHeight: tamanho * 0.6 }}>
        {letra}
      </Text>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel="Duas vozes: protestante e católica">
      {bolinha(COR_PROTESTANTE, 'P', false)}
      {bolinha(COR_CATOLICA, 'C', true)}
    </View>
  );
}

export function Pilula({ icone, rotulo }: { icone?: keyof typeof Ionicons.glyphMap; rotulo: string }) {
  return (
    <View style={estilos.pilula}>
      {icone ? <Ionicons name={icone} size={12} color="#8B6914" /> : null}
      <Text style={estilos.pilulaTexto}>{rotulo}</Text>
    </View>
  );
}

export function Etapas({ total, feitas, atual }: { total: number; feitas: number; atual?: number }) {
  const { scheme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor:
              atual === i + 1 ? scheme.accent : i < feitas ? scheme.gold : scheme.border,
          }}
        />
      ))}
    </View>
  );
}

export function AnelProgresso({ feitos, total, tamanho = 50 }: { feitos: number; total: number; tamanho?: number }) {
  const { scheme, effectiveMode } = useTheme();
  const raio = (tamanho - 6) / 2;
  const perimetro = 2 * Math.PI * raio;
  const fracao = total > 0 ? feitos / total : 0;
  // Miolo com fundo proprio (igual a `.ring span` da proposta aprovada em
  // screenshots/proposta-trilhas.html): sem ele, o numero so fica legivel se o
  // card por tras tambem estiver com o fundo de acento aplicado.
  const miolo = tamanho - 10;
  const trilhaCor = effectiveMode === 'dark' ? 'rgba(21,18,15,0.22)' : 'rgba(255,255,255,0.18)';
  const arcoCor = effectiveMode === 'dark' ? scheme.onAccent : scheme.goldSoft;
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tamanho} height={tamanho} style={StyleSheet.absoluteFill}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={raio} stroke={trilhaCor} strokeWidth={5} fill="none" />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={arcoCor}
          strokeWidth={5}
          fill="none"
          strokeDasharray={`${perimetro * fracao} ${perimetro}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>
      <View
        style={{
          width: miolo,
          height: miolo,
          borderRadius: miolo / 2,
          backgroundColor: scheme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 16, color: scheme.onAccent }}>
          {`${feitos}/${total}`}
        </Text>
      </View>
    </View>
  );
}

export function CartaoTrilha({ trilha, onPress }: { trilha: TrailSummary; onPress: () => void }) {
  const { scheme } = useTheme();
  const emAndamento = trilha.progress?.status === 'active';
  const concluida = trilha.progress?.status === 'completed';
  const legenda = emAndamento
    ? `Em andamento · ${trilha.progress?.completed_days}/${trilha.days_count}`
    : concluida
      ? 'Concluída'
      : trilha.subtitle;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trilha.name}, ${trilha.days_count} dias${trilha.locked ? ', exclusiva para Apoiadores' : ''}`}
    >
      {({ pressed }) => (
        <View
          style={[
            estilos.cartao,
            { backgroundColor: scheme.surface, borderColor: scheme.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <CapaTrilha cover={trilha.cover} style={estilos.cartaoCapa}>
            {trilha.kind === 'duas_vozes' ? (
              <View style={{ position: 'absolute', left: 9, top: 9 }}>
                <SeloVozes />
              </View>
            ) : null}
            {trilha.tier === 'free' ? (
              <View style={[estilos.canto, { backgroundColor: 'rgba(26,26,26,0.45)' }]}>
                <Text style={[estilos.cantoTexto, { color: '#FFFFFF' }]}>GRÁTIS</Text>
              </View>
            ) : trilha.locked ? (
              <View style={[estilos.cadeado, { backgroundColor: 'rgba(255,255,255,0.9)' }]}>
                <Ionicons name="lock-closed" size={12} color="#8B6914" />
              </View>
            ) : null}
            {concluida ? (
              <View style={[estilos.cadeado, { backgroundColor: scheme.gold }]}>
                <Ionicons name="checkmark" size={14} color={scheme.onAccent} />
              </View>
            ) : null}
            <View style={estilos.dias}>
              <Text style={estilos.diasTexto}>{`${trilha.days_count} DIAS`}</Text>
            </View>
          </CapaTrilha>
          <View style={{ paddingHorizontal: 10, paddingTop: 9, paddingBottom: 11 }}>
            <Text style={{ fontFamily: fonts.serifSemi, fontSize: 17, lineHeight: 20, color: scheme.textPrimary }} numberOfLines={2}>
              {trilha.name}
            </Text>
            <Text variant="micro" color={emAndamento ? scheme.accent : scheme.textMuted} style={{ marginTop: 3 }} numberOfLines={1}>
              {legenda}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pilulaTexto: { fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14, color: '#1A1A1A' },
  cartao: {
    width: 152,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cartaoCapa: { height: 80, justifyContent: 'flex-end', padding: 9 },
  canto: {
    position: 'absolute',
    right: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  cantoTexto: { fontFamily: fonts.bodySemi, fontSize: 9, lineHeight: 12, letterSpacing: 1.2 },
  cadeado: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dias: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  diasTexto: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 13, letterSpacing: 1.2, color: '#1A1A1A' },
});

