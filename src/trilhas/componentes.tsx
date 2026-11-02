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
      {icone ? <Ionicons name={icone} size={12} color="#7A5C10" /> : null}
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

export function AnelProgresso({
  feitos,
  total,
  tamanho = 50,
  quieto = false,
}: {
  feitos: number;
  total: number;
  tamanho?: number;
  quieto?: boolean;
}) {
  const { scheme, effectiveMode } = useTheme();
  const raio = (tamanho - 6) / 2;
  const perimetro = 2 * Math.PI * raio;
  const fracao = total > 0 ? feitos / total : 0;
  // Miolo com fundo proprio (igual a `.ring span` da proposta aprovada em
  // screenshots/proposta-trilhas.html): sem ele, o numero so fica legivel se o
  // card por tras tambem estiver com o fundo de acento aplicado.
  const miolo = tamanho - 10;
  const trilhaCor = quieto ? scheme.border : effectiveMode === 'dark' ? 'rgba(21,18,15,0.22)' : 'rgba(255,255,255,0.18)';
  const arcoCor = quieto ? scheme.gold : effectiveMode === 'dark' ? scheme.onAccent : scheme.goldSoft;
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
          backgroundColor: quieto ? 'transparent' : scheme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 16, color: quieto ? scheme.textPrimary : scheme.onAccent }}>
          {`${feitos}/${total}`}
        </Text>
      </View>
    </View>
  );
}

export function LinhaTrilha({ trilha, onPress }: { trilha: TrailSummary; onPress: () => void }) {
  const { scheme } = useTheme();
  const emAndamento = trilha.progress?.status === 'active';
  const concluida = trilha.progress?.status === 'completed';
  const situacao = emAndamento
    ? `Em andamento · ${trilha.progress?.completed_days}/${trilha.days_count}`
    : concluida
      ? 'Concluída'
      : `${trilha.days_count} dias · ${trilha.tier === 'free' ? 'Grátis' : 'Apoiador'}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${trilha.name}, ${trilha.days_count} dias${trilha.locked ? ', exclusiva para Apoiadores' : ''}`}
    >
      {({ pressed }) => (
        <View style={[estilos.linha, { borderBottomColor: scheme.borderSoft }, pressed && { opacity: 0.7 }]}>
          <View>
            <CapaTrilha cover={trilha.cover} style={estilos.linhaCapa}>
              <Text style={estilos.linhaNumero}>{trilha.days_count}</Text>
            </CapaTrilha>
            {trilha.kind === 'duas_vozes' ? (
              <View style={{ position: 'absolute', right: -5, top: -5 }}>
                <SeloVozes tamanho={18} />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.serifSemi, fontSize: 20, lineHeight: 24, color: scheme.textPrimary }} numberOfLines={2}>
              {trilha.name}
            </Text>
            <Text variant="micro" color={scheme.textMuted} numberOfLines={1} style={{ marginTop: 1 }}>
              {trilha.subtitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              {trilha.locked ? <Ionicons name="lock-closed" size={12} color={scheme.gold} /> : null}
              {concluida ? <Ionicons name="checkmark-circle" size={13} color={scheme.gold} /> : null}
              <Text
                variant="micro"
                font="bodySemi"
                color={trilha.locked || concluida ? scheme.gold : emAndamento ? scheme.accent : scheme.textSecondary}
              >
                {situacao}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={scheme.textGhost} />
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
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linhaCapa: { width: 66, height: 66, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  linhaNumero: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: 'rgba(40,28,12,0.76)' },
});

