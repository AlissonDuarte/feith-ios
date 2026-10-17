import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, GoldRule, Loading, Overline, Tag, Text } from '../../src/components/ui';
import { StreakCalendarGrid } from '../../src/streak/StreakCalendarGrid';
import { proximoMarco, STREAK_MILESTONES } from '../../src/streak/milestones';
import { StreakRing } from '../../src/streak/StreakRing';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, radius, space } from '../../src/theme/tokens';

const LETRAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function mesmoMes(a: { year: number; month: number }, b: Date) {
  return a.year === b.getFullYear() && a.month === b.getMonth() + 1;
}

export default function Sequencia() {
  const { scheme } = useTheme();
  const router = useRouter();
  const { summary, isSupporter } = useAuth();

  const hoje = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: hoje.getFullYear(), month: hoje.getMonth() + 1 });
  const [diasLidos, setDiasLidos] = useState<number[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    api
      .getStreakCalendar(cursor.year, cursor.month)
      .then((r) => {
        if (!cancelado) setDiasLidos(r.days_read);
      })
      .catch((e) => {
        if (!cancelado) setErro(mensagemDe(e));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [cursor]);

  const streak = summary?.streak ?? 0;
  const best = summary?.streak_best ?? 0;
  const totalDays = summary?.streak_total_days ?? 0;
  const freezeDisponivel = summary?.streak_freeze_available ?? false;
  const proximo = proximoMarco(streak);

  const mudarMes = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };

  // A semana so faz sentido quando o mes exibido e o atual — navegar para
  // outro mes mostra o calendario daquele mes, mas a faixa de "esta semana"
  // continua sendo a de verdade, nao a do mes visitado.
  const mostrarSemana = mesmoMes(cursor, hoje) && diasLidos !== null;
  const semana = mostrarSemana
    ? Array.from({ length: 7 }, (_, i) => {
        const offset = i - hoje.getDay();
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + offset);
        const mesmoMesAtual = data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
        const lido = mesmoMesAtual && (diasLidos?.includes(data.getDate()) ?? false);
        const futuro = data > hoje && data.toDateString() !== hoje.toDateString();
        const ehHoje = data.toDateString() === hoje.toDateString();
        return { letra: LETRAS_SEMANA[i], dia: data.getDate(), lido, futuro, ehHoje };
      })
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', paddingTop: space.md }}>
          <StreakRing streak={streak} scheme={scheme} />
          <Text variant="caption" color={scheme.textMuted} style={{ marginTop: space.md, textAlign: 'center' }}>
            {proximo !== null ? (
              <>
                Faltam <Text variant="caption" font="bodySemi" color={scheme.textPrimary}>{proximo - streak} dias</Text> para o marco de {proximo}
              </>
            ) : (
              'Você já bateu todos os marcos 🏆'
            )}
          </Text>
        </View>

        {mostrarSemana ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {semana.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: d.ehHoje ? 2 : 1.5,
                    borderColor: d.ehHoje ? scheme.accent : d.lido ? colors.streak : scheme.border,
                    borderStyle: d.futuro ? 'dashed' : 'solid',
                    backgroundColor: d.lido ? colors.streak : 'transparent',
                  }}
                >
                  {d.lido ? (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  ) : (
                    <Text variant="micro" font="bodySemi" color={d.ehHoje ? scheme.accent : scheme.textGhost}>
                      {d.dia}
                    </Text>
                  )}
                </View>
                <Text variant="micro" color={scheme.textGhost}>
                  {d.letra}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', borderRadius: radius.sm, borderWidth: 1, borderColor: scheme.border, backgroundColor: scheme.surface }}>
          {[
            { valor: streak, rotulo: 'Atual' },
            { valor: best, rotulo: 'Recorde' },
            { valor: totalDays, rotulo: 'Dias no total' },
          ].map((s, i) => (
            <View
              key={s.rotulo}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: space.lg,
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: scheme.borderSoft,
              }}
            >
              <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, color: scheme.accent }}>{s.valor}</Text>
              <Text variant="micro" color={scheme.textGhost} style={{ marginTop: 2 }}>
                {s.rotulo}
              </Text>
            </View>
          ))}
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => mudarMes(-1)} hitSlop={10}>
              <Ionicons name="chevron-back" size={18} color={scheme.textMuted} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => mudarMes(1)} hitSlop={10}>
              <Ionicons name="chevron-forward" size={18} color={scheme.textMuted} />
            </Pressable>
          </View>
          {carregando ? (
            <Loading />
          ) : erro ? (
            <Text variant="caption" color={scheme.accent}>
              {erro}
            </Text>
          ) : (
            <StreakCalendarGrid year={cursor.year} month={cursor.month} daysRead={diasLidos ?? []} scheme={scheme} />
          )}
        </Card>

        <Card style={!isSupporter ? { opacity: 0.85 } : undefined}>
          <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Ionicons
              name={isSupporter ? 'shield-checkmark' : 'lock-closed'}
              size={20}
              color={isSupporter ? colors.gold : scheme.textGhost}
            />
            <View style={{ flex: 1 }}>
              {!isSupporter ? (
                <View style={{ marginBottom: 6 }}>
                  <Tag icon="ribbon-outline" color={scheme.gold} border={scheme.goldSoft}>
                    Apoiador
                  </Tag>
                </View>
              ) : null}
              <Text variant="caption" font="bodySemi">
                {isSupporter
                  ? freezeDisponivel
                    ? '1 protetor de sequência disponível'
                    : 'Protetor já usado este mês'
                  : 'Protetor de sequência'}
              </Text>
              <Text variant="micro" color={scheme.textMuted} style={{ marginTop: 3 }}>
                {isSupporter
                  ? 'Se você perder um dia, ele entra em ação sozinho e sua sequência continua intacta.'
                  : 'Apoiador ganha 1 protetor por mês: perde um dia sem quebrar a sequência.'}
              </Text>
              {!isSupporter ? (
                <Button
                  label="Seja Apoiador"
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push('/assinatura')}
                  style={{ marginTop: space.md, alignSelf: 'flex-start' }}
                />
              ) : null}
            </View>
          </View>
        </Card>

        <View>
          <Overline>Marcos</Overline>
          <GoldRule align="left" width={32} style={{ marginTop: space.sm }} />
          <View style={{ flexDirection: 'row', marginTop: space.lg }}>
            {STREAK_MILESTONES.map((marco) => {
              const alcancado = best >= marco;
              return (
                <View key={marco} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: alcancado ? colors.gold : scheme.canvasWarm,
                      borderWidth: alcancado ? 0 : 1.5,
                      borderColor: scheme.border,
                      borderStyle: alcancado ? 'solid' : 'dashed',
                    }}
                  >
                    <Ionicons
                      name={alcancado ? 'flame' : 'flame-outline'}
                      size={18}
                      color={alcancado ? '#fff' : scheme.textGhost}
                    />
                  </View>
                  <Text variant="micro" color={alcancado ? scheme.textPrimary : scheme.textGhost}>
                    {marco}d
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
