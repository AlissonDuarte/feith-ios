import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { diasDoServidor, diasParaServidor } from '../../src/api/agendamento';
import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { WeekdayCode } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, GoldRule, Overline, Text, scheme } from '../../src/components/ui';
import { disablePush, getPushState, registerForPush, type PushStatus } from '../../src/push/registerDevice';
import { fonts, radius, space } from '../../src/theme/tokens';

const DIAS: { codigo: WeekdayCode; rotulo: string; nome: string }[] = [
  { codigo: 'seg', rotulo: 'S', nome: 'Segunda' },
  { codigo: 'ter', rotulo: 'T', nome: 'Terça' },
  { codigo: 'qua', rotulo: 'Q', nome: 'Quarta' },
  { codigo: 'qui', rotulo: 'Q', nome: 'Quinta' },
  { codigo: 'sex', rotulo: 'S', nome: 'Sexta' },
  { codigo: 'sab', rotulo: 'S', nome: 'Sábado' },
  { codigo: 'dom', rotulo: 'D', nome: 'Domingo' },
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
  const desligado = !ligado;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Interruptor ────────────────────────────────────────────────
            Primeiro e sozinho no card: e a decisao que governa tudo abaixo. */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: space.lg }}>
              <Text variant="heading">Lembrete diário</Text>
              <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 4 }}>
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

        {/* O agendamento continua editavel com o lembrete desligado — a pessoa
            pode preparar o horario antes de aceitar a permissao — mas em meio
            tom, para nao prometer entrega que nao vai acontecer. */}
        <View style={{ opacity: desligado ? 0.55 : 1, gap: space.xl }}>
          <View>
            <Overline>Dias</Overline>
            <GoldRule align="left" width={32} style={{ marginTop: space.sm }} />

            <View style={{ flexDirection: 'row', gap: 6, marginTop: space.lg }}>
              {DIAS.map((d) => {
                const ativo = dias.includes(d.codigo);
                return (
                  <Pressable
                    key={d.codigo}
                    onPress={() => alternarDia(d.codigo)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ativo }}
                    // O rotulo visivel repete letras (S, T, Q, Q, S, S, D); o
                    // leitor de tela precisa do nome inteiro.
                    accessibilityLabel={d.nome}
                    style={({ pressed }) => [
                      estilos.dia,
                      ativo && estilos.diaAtivo,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      variant="caption"
                      font={ativo ? 'bodySemi' : 'body'}
                      color={ativo ? scheme.accent : scheme.textSecondary}
                    >
                      {d.rotulo}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {nenhumDia ? (
              <Text variant="caption" color={scheme.accent} style={{ marginTop: space.sm }}>
                Escolha ao menos um dia.
              </Text>
            ) : null}
          </View>

          <View>
            <Overline>Horário</Overline>
            <GoldRule align="left" width={32} style={{ marginTop: space.sm }} />

            {/* O horario em serifada grande: e o unico numero desta tela, e o
                que a pessoa veio conferir. */}
            <Pressable
              onPress={() => setMostrandoPicker((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`Horário do lembrete: ${hora}`}
              style={({ pressed }) => [estilos.hora, pressed && { borderColor: scheme.accent }]}
            >
              <Text style={estilos.horaTexto}>{hora}</Text>
              <Ionicons
                name={mostrandoPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={scheme.textGhost}
              />
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
              <Button
                label="Pronto"
                variant="secondary"
                size="sm"
                onPress={() => setMostrandoPicker(false)}
              />
            </Card>
          ) : null}
        </View>

        {erro ? (
          <Text variant="caption" color={scheme.accent}>
            {erro}
          </Text>
        ) : null}

        <Button
          label="Salvar lembrete"
          onPress={salvar}
          loading={salvando}
          disabled={salvando || nenhumDia}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  /**
   * Marcado e DESmarcado precisam ser legiveis nesta tela, nao so distintos.
   *
   * O par anterior era oxblood-solido-com-letra-branca contra branco-puro: o
   * desmarcado sumia sobre o creme (branco em off-white, com fio a 9% e letra
   * cinza-clara), e o marcado dependia de uma letra branca minuscula. Agora o
   * desmarcado tem corpo quente e letra escura, e o marcado se anuncia por fio
   * oxblood cheio + letra oxblood — sem branco em lugar nenhum.
   */
  dia: {
    flex: 1,
    height: 46,
    borderRadius: radius.sharp,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.canvasWarm,
  },
  diaAtivo: {
    borderWidth: 1.5,
    borderColor: scheme.accent,
    backgroundColor: scheme.accentSubtle,
  },
  hora: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.surface,
    paddingHorizontal: 18,
    marginTop: space.lg,
  },
  horaTexto: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 38,
    color: scheme.textPrimary,
  },
});
