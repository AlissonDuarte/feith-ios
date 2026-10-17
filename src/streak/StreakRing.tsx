import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '../components/ui';
import { colors, fonts, type Scheme } from '../theme/tokens';
import { progressoParaProximoMarco } from './milestones';

interface Props {
  streak: number;
  scheme: Scheme;
  size?: number;
  strokeWidth?: number;
}

/** Anel de progresso até o próximo marco (7/14/30/100/365 dias), com a chama no centro. */
export function StreakRing({ streak, scheme, size = 134, strokeWidth = 10 }: Props) {
  const raio = (size - strokeWidth) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = progressoParaProximoMarco(streak);
  const offset = circunferencia * (1 - progresso);
  const miolo = size - strokeWidth * 2.6;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={raio} stroke={scheme.borderSoft} strokeWidth={strokeWidth} fill="none" />
        {progresso > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={raio}
            stroke={colors.streak}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset}
            fill="none"
          />
        ) : null}
      </Svg>
      <View
        style={{
          width: miolo,
          height: miolo,
          borderRadius: miolo / 2,
          backgroundColor: scheme.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="flame" size={22} color={colors.streak} />
        <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: scheme.textPrimary, marginTop: 1 }}>
          {streak}
        </Text>
        <Text
          variant="micro"
          font="bodySemi"
          color={colors.streak}
          style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 }}
        >
          dias
        </Text>
      </View>
    </View>
  );
}
