import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { diasDoServidor, diasParaServidor } from '../../src/api/agendamento';
import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { WeekdayCode } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, Text, scheme } from '../../src/components/ui';
import { disablePush, getPushState, registerForPush, type PushStatus } from '../../src/push/registerDevice';
import { radius } from '../../src/theme/tokens';

const DIAS: { codigo: WeekdayCode; rotulo: string }[] = [
  { codigo: 'seg', rotulo: 'S' },
  { codigo: 'ter', rotulo: 'T' },
  { codigo: 'qua', rotulo: 'Q' },
  { codigo: 'qui', rotulo: 'Q' },
  { codigo: 'sex', rotulo: 'S' },
  { codigo: 'sab', rotulo: 'S' },
  { codigo: 'dom', rotulo: 'D' },
];

function horaParaData(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function dataParaHora(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Notificacoes() {
  const { summary, refreshSummary } = useAuth();

  const agendamento = summary?.notification_schedule as
    | { days?: WeekdayCode[]; time?: string }
    | undefined;

  // A conversao entre o que o servidor guarda e o que a tela marca vive em
  // src/api/agendamento.ts, com teste: lista vazia significa TODOS os dias.
  const [dias, setDias] = useState<WeekdayCode[]>(diasDoServidor(agendamento?.days));
  const [hora, setHora] = useState(agendamento?.time ?? '08:00');
  const [mostrandoPicker, setMostrandoPicker] = useState(false);

  const [status, setStatus] = useState<PushStatus>('undetermined');
  const [ligado, setLigado] = useState(false);
  const [mexendo, setMexendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void getPushState().then((s) => {
      setStatus(s.status);
      setLigado(s.enabled);
    });
  }, []);

  async function alternarLembretes(valor: boolean) {
    setMexendo(true);
    setErro(null);
    try {
      if (!valor) {
        await disablePush();
        setLigado(false);
        return;
      }

      // `force` porque o toggle e o unico lugar em que a pessoa esta pedindo
      // para RELIGAR: ele ignora um opt-out anterior de proposito.
      const novo = await registerForPush({ promptIfNeeded: true, force: true });
      setStatus(novo);
      setLigado(novo === 'granted');

      if (novo === 'denied') {
        // A permissao do iOS so pode ser concedida uma vez; depois de negada,
        // religar exige os Ajustes do sistema. Dizer isso e melhor do que um
        // toggle que volta sozinho sem explicacao.
        Alert.alert(
          'Notificações desativadas',
          'Você precisa permitir notificações nos Ajustes do iPhone para receber os lembretes.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir Ajustes', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setMexendo(false);
    }
  }

  function alternarDia(codigo: WeekdayCode) {
    setDias((atuais) =>
      atuais.includes(codigo) ? atuais.filter((d) => d !== codigo) : [...atuais, codigo],
    );
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await api.updateProfile({
        notification_schedule: {
          days: diasParaServidor(dias),
          time: hora,
        },
      });
      await refreshSummary();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  const nenhumDia = dias.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text variant="body" weight="semi">
                Lembrete diário
              </Text>
              <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 4 }}>
                {status === 'unsupported'
                  ? 'Só funciona em um aparelho físico.'
                  : 'Um aviso quando a reflexão do dia estiver disponível.'}
              </Text>
            </View>
            <Switch
              value={ligado}
              onValueChange={(v) => void alternarLembretes(v)}
              disabled={mexendo || status === 'unsupported'}
              trackColor={{ true: scheme.accent, false: scheme.border }}
            />
          </View>
        </Card>

        <View>
          <Text variant="caption" weight="semi" color={scheme.textSecondary}>
            DIAS
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {DIAS.map((d, i) => {
              const ativo = dias.includes(d.codigo);
              return (
                <Pressable
                  key={d.codigo}
                  onPress={() => alternarDia(d.codigo)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ativo }}
                  // O rotulo visivel repete letras (S, T, Q, Q, S, S, D); o
                  // leitor de tela precisa do nome inteiro.
                  accessibilityLabel={
                    ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][i]
                  }
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      height: 44,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: ativo ? scheme.accent : scheme.border,
                      backgroundColor: ativo ? scheme.accentSubtle : scheme.surface,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="semi"
                    color={ativo ? scheme.accent : scheme.textMuted}
                  >
                    {d.rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {nenhumDia ? (
            <Text variant="caption" color="#E11D48" style={{ marginTop: 8 }}>
              Escolha ao menos um dia.
            </Text>
          ) : null}
        </View>

        <View>
          <Text variant="caption" weight="semi" color={scheme.textSecondary}>
            HORÁRIO
          </Text>
          <Pressable onPress={() => setMostrandoPicker((v) => !v)}>
            <View
              style={{
                minHeight: 52,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: scheme.border,
                backgroundColor: scheme.surface,
                paddingHorizontal: 16,
                marginTop: 8,
                justifyContent: 'center',
              }}
            >
              <Text variant="body">{hora}</Text>
            </View>
          </Pressable>
        </View>

        {mostrandoPicker ? (
          <Card>
            <DateTimePicker
              value={horaParaData(hora)}
              mode="time"
              display="spinner"
              locale="pt-BR"
              onChange={(_, d) => {
                if (d) setHora(dataParaHora(d));
                if (Platform.OS !== 'ios') setMostrandoPicker(false);
              }}
            />
            <Button label="Pronto" variant="secondary" onPress={() => setMostrandoPicker(false)} />
          </Card>
        ) : null}

        {erro ? (
          <Text variant="caption" color="#E11D48">
            {erro}
          </Text>
        ) : null}

        <Button
          label="Salvar horário"
          onPress={salvar}
          loading={salvando}
          disabled={salvando || nenhumDia}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
