import { View } from 'react-native';

import { Text } from '../components/ui';
import { colors, type Scheme } from '../theme/tokens';

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface Props {
  year: number;
  /** 1-12 */
  month: number;
  daysRead: number[];
  scheme: Scheme;
}

/**
 * Grid do mês com os dias lidos destacados. Um dia é lido ou não — não há no
 * modelo de dados uma noção de "quanto" se leu naquele dia (UserReadingLog é
 * 1 linha por usuário/dia), então, diferente do mockup inicial, as células
 * não variam de intensidade.
 */
export function StreakCalendarGrid({ year, month, daysRead, scheme }: Props) {
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === year && hoje.getMonth() + 1 === month;
  const diaHoje = hoje.getDate();
  const totalDias = new Date(year, month, 0).getDate();
  const lidos = new Set(daysRead);
  const primeiroDiaSemana = new Date(year, month - 1, 1).getDay();

  const celulas: (number | null)[] = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="caption" font="bodySemi">
          {NOMES_MES[month - 1]}
        </Text>
        <Text variant="micro" color={scheme.textGhost}>
          {lidos.size} de {totalDias} dias
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {LETRAS_SEMANA.map((letra, i) => (
          <Text
            key={`${letra}-${i}`}
            variant="micro"
            color={scheme.textGhost}
            style={{ width: `${100 / 7}%`, textAlign: 'center' }}
          >
            {letra}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {celulas.map((dia, i) => {
          if (dia === null) {
            return <View key={`vazio-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }} />;
          }
          const lido = lidos.has(dia);
          const ehHoje = ehMesAtual && dia === diaHoje;
          return (
            <View key={dia} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 5,
                  backgroundColor: lido ? colors.streak : scheme.borderSoft,
                  borderWidth: ehHoje ? 2 : 0,
                  borderColor: scheme.accent,
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
