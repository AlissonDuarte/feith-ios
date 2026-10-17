import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '../components/ui';
import { colors, fonts } from '../theme/tokens';

export type ShareCardTemplate = 'pergaminho' | 'oxblood' | 'noite';

export const SHARE_CARD_TEMPLATES: { valor: ShareCardTemplate; rotulo: string }[] = [
  { valor: 'pergaminho', rotulo: 'Pergaminho' },
  { valor: 'oxblood', rotulo: 'Oxblood' },
  { valor: 'noite', rotulo: 'Noite' },
];

/**
 * Paletas fixas, independentes do tema do app (claro/escuro/sistema) — a
 * pessoa escolhe o visual do CARTÃO, não o da tela. Cores saem de
 * src/theme/palette.js para não duplicar hex à mão.
 */
const PALETAS: Record<
  ShareCardTemplate,
  { fundo: string; texto: string; textoFraco: string; divisor: string; borda?: string; selo: string }
> = {
  pergaminho: {
    fundo: colors.cream,
    texto: colors.ink,
    textoFraco: colors['ink-faint'],
    divisor: colors['gold-light'],
    borda: colors.rule,
    selo: colors.oxblood,
  },
  oxblood: {
    fundo: '#4a1316',
    texto: '#FBF2DC',
    textoFraco: 'rgba(251,242,220,0.72)',
    divisor: colors['gold-pale'],
    selo: '#5C1D24',
  },
  noite: {
    fundo: colors['dark-bg'],
    texto: colors['dark-text'],
    textoFraco: colors['ink-ghost'],
    divisor: colors['gold-light'],
    borda: colors['dark-rule'],
    selo: colors['dark-surface'],
  },
};

function Marca({ selo, tamanho = 18 }: { selo: string; tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx="22" fill={selo} stroke="rgba(216,199,154,0.5)" strokeWidth="2" />
      <Circle cx="50" cy="50" r="34" fill="none" stroke="#D1AE38" strokeWidth="3.4" />
      <Path d="M50 27v46M34 45.5h32" stroke="#D1AE38" strokeWidth="6" strokeLinecap="round" />
    </Svg>
  );
}

interface Props {
  template: ShareCardTemplate;
  scriptureReference: string;
  quote: string;
  streakDays?: number;
  width?: number;
  height?: number;
}

/** O cartão em si — capturado como imagem por useShareCardExport. */
export function ShareCard({ template, scriptureReference, quote, streakDays, width = 280, height = 420 }: Props) {
  const p = PALETAS[template];
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 20,
        backgroundColor: p.fundo,
        borderWidth: p.borda ? 1 : 0,
        borderColor: p.borda,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 26,
        overflow: 'hidden',
      }}
    >
      {streakDays ? (
        <View
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 12,
            backgroundColor: template === 'pergaminho' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.14)',
          }}
        >
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: p.texto }}>🔥 {streakDays} dias</Text>
        </View>
      ) : null}

      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 10,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          color: p.textoFraco,
        }}
      >
        {scriptureReference}
      </Text>

      <Text
        style={{
          fontFamily: fonts.serifItalic,
          fontSize: 22,
          lineHeight: 30,
          color: p.texto,
          textAlign: 'center',
          marginTop: 14,
        }}
      >
        "{quote}"
      </Text>

      <View style={{ width: 36, height: 1, backgroundColor: p.divisor, marginTop: 18 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }}>
        <Marca selo={p.selo} />
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: p.texto, letterSpacing: 0.5 }}>feith</Text>
      </View>
    </View>
  );
}
