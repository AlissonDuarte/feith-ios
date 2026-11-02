import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { mensagemDe } from '../src/api/errors';
import { useAuth } from '../src/auth/AuthContext';
import { Button, Card, GoldRule, Overline, Text } from '../src/components/ui';
import { posthog } from '../src/config/posthog';
import { PRIMEIRO_DIA_KEY } from '../src/leitura/primeiroDia';
import { ativarLembretes, registrarExibicao, registrarRecusa } from '../src/push/useConviteLembrete';
import { useTheme } from '../src/theme/ThemeContext';
import { colors, radius, space, type Scheme } from '../src/theme/tokens';

const OPCOES: { hora: string; rotulo: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { hora: '07:00', rotulo: 'Ao acordar', icone: 'sunny-outline' },
  { hora: '12:30', rotulo: 'No almoço', icone: 'partly-sunny-outline' },
  { hora: '21:30', rotulo: 'Antes de dormir', icone: 'moon-outline' },
];

function paraData(hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  const data = new Date();
  data.setHours(h, m, 0, 0);
  return data;
}

function paraHora(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

function rotuloHora(hora: string): string {
  return hora.replace(/^0/, '');
}

export default function PrimeiroDia() {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const router = useRouter();
  const { isGuest, refreshSummary } = useAuth();
  const [hora, setHora] = useState('21:30');
  const [mostrandoPicker, setMostrandoPicker] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    registrarExibicao('primeiro_dia');
    void AsyncStorage.setItem(PRIMEIRO_DIA_KEY, '1');
  }, []);

  function seguir() {
    router.replace('/(tabs)/hoje');
    if (isGuest) router.push('/conta');
  }

  async function ativar() {
    setErro(null);
    setSalvando(true);
    try {
      await api.updateProfile({ notification_schedule: { days: [], time: hora } });
      await ativarLembretes('primeiro_dia');
      await refreshSummary();
      posthog?.capture('first_day_reminder_chosen', { hora });
      seguir();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  async function agoraNao() {
    await registrarRecusa('primeiro_dia');
    seguir();
  }

  const personalizada = !OPCOES.some((o) => o.hora === hora);

  return (
    <SafeAreaView style={estilos.tela}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.gutter, paddingBottom: space.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md }}>
          <Ionicons name="checkmark-circle" size={44} color={colors.streak} />
          <View style={{ flex: 1 }}>
            <Text variant="title" font="serifSemi">
              Primeiro dia lido
            </Text>
            <Text variant="caption" color={scheme.textMuted}>
              Sua sequência começou hoje.
            </Text>
          </View>
        </View>

        <GoldRule align="left" width={56} style={{ marginTop: space.xl }} />

        <Text variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>
          Quando você quer ler amanhã?
        </Text>
        <Text color={scheme.textSecondary} style={{ fontSize: 16, lineHeight: 25, marginTop: space.sm }}>
          Muita gente lê à noite. Escolha o momento em que você já costuma parar.
        </Text>

        <View style={{ gap: 10, marginTop: space.lg }} accessibilityRole="radiogroup">
          {OPCOES.map((opcao) => {
            const ativa = opcao.hora === hora;
            return (
              <Pressable
                key={opcao.hora}
                onPress={() => setHora(opcao.hora)}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativa }}
                accessibilityLabel={`${opcao.rotulo}, ${rotuloHora(opcao.hora)}`}
              >
                <View style={[estilos.opcao, ativa && estilos.opcaoAtiva]}>
                  <Ionicons name={opcao.icone} size={22} color={ativa ? scheme.accent : scheme.textMuted} />
                  <Text variant="bodySm" font="bodySemi" style={{ flex: 1 }}>
                    {opcao.rotulo}
                  </Text>
                  <Text variant="caption" color={scheme.textMuted} style={{ fontVariant: ['tabular-nums'] }}>
                    {rotuloHora(opcao.hora)}
                  </Text>
                  <View style={[estilos.radio, ativa && { borderColor: scheme.accent }]}>
                    {ativa ? <View style={estilos.radioMiolo} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button
          label={personalizada ? `Outro horário: ${rotuloHora(hora)}` : 'Escolher outro horário'}
          variant="ghost"
          textColor={scheme.accent}
          onPress={() => setMostrandoPicker(true)}
          style={{ alignSelf: 'center', marginTop: space.xs }}
        />

        {mostrandoPicker ? (
          <Card>
            <DateTimePicker
              value={paraData(hora)}
              mode="time"
              display="spinner"
              locale="pt-BR"
              onChange={(_, d) => {
                if (d) setHora(paraHora(d));
                if (Platform.OS !== 'ios') setMostrandoPicker(false);
              }}
            />
            <Button label="Pronto" variant="secondary" size="sm" onPress={() => setMostrandoPicker(false)} />
          </Card>
        ) : null}

        <View style={{ marginTop: 'auto', paddingTop: space.lg }}>
          <Overline style={{ marginBottom: space.sm }}>Como vai chegar</Overline>
          <View style={estilos.previa}>
            <Image source={require('../assets/icon.png')} style={estilos.previaIcone} accessibilityIgnoresInvertColors />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" font="bodySemi">
                  feith
                </Text>
                <Text variant="micro" color={scheme.textMuted}>
                  {rotuloHora(hora)}
                </Text>
              </View>
              <Text variant="caption" color={scheme.textSecondary}>
                A reflexão de hoje está pronta. Reserve um minuto para a Palavra.
              </Text>
            </View>
          </View>

          {erro ? (
            <Text variant="caption" color={scheme.accent} style={{ marginTop: space.sm, textAlign: 'center' }}>
              {erro}
            </Text>
          ) : null}

          <Button
            label={`Lembrar às ${rotuloHora(hora)}`}
            iconLeft="notifications"
            loading={salvando}
            disabled={salvando}
            onPress={() => void ativar()}
            style={{ marginTop: space.lg }}
          />
          <Button
            label="Agora não"
            variant="ghost"
            textColor={scheme.accent}
            disabled={salvando}
            onPress={() => void agoraNao()}
            style={{ alignSelf: 'center', marginTop: space.xs }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: scheme.canvas },
    opcao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 60,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    opcaoAtiva: { borderWidth: 1.5, borderColor: scheme.accent, backgroundColor: scheme.canvasWarm },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: scheme.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioMiolo: { width: 12, height: 12, borderRadius: 6, backgroundColor: scheme.accent },
    previa: {
      flexDirection: 'row',
      gap: space.md,
      alignItems: 'center',
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: scheme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    previaIcone: { width: 38, height: 38, borderRadius: 9 },
  });
}
