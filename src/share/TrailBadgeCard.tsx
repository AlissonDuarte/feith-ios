import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '../components/ui';
import { fonts } from '../theme/tokens';
import { CARTAO_PALETAS, Marca, type ShareCardTemplate } from './ShareCard';

interface Props {
  template: ShareCardTemplate;
  trailName: string;
  days: number;
  sealEarned?: boolean;
  width?: number;
  height?: number;
}

/** Cartão de conquista da trilha — mesmo molde do ShareCard, capturado como imagem por useShareCardExport. */
export function TrailBadgeCard({ template, trailName, days, sealEarned, width = 280, height = 420 }: Props) {
  const p = CARTAO_PALETAS[template];
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
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 10,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          color: p.textoFraco,
        }}
      >
        Trilha concluída
      </Text>

      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          marginTop: 16,
          backgroundColor: p.selo,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="footsteps-outline" size={32} color="#FFFFFF" />
      </View>

      <Text
        style={{
          fontFamily: fonts.serifSemi,
          fontSize: 24,
          lineHeight: 29,
          color: p.texto,
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        {trailName}
      </Text>

      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          lineHeight: 19,
          color: p.textoFraco,
          textAlign: 'center',
          marginTop: 6,
        }}
      >
        {sealEarned ? `${days} dias com a Palavra · selo conquistado` : `${days} dias com a Palavra, um passo por dia`}
      </Text>

      <View style={{ width: 36, height: 1, backgroundColor: p.divisor, marginTop: 18 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }}>
        <Marca selo={p.selo} />
        <Text style={{ fontFamily: fonts.display, fontSize: 18, color: p.texto, letterSpacing: 0.5 }}>feith</Text>
      </View>
    </View>
  );
}
