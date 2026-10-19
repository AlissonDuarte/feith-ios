import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../../src/api/client';
import { mensagemDe } from '../../../src/api/errors';
import type { TrailDayItem, TrailDetail } from '../../../src/api/types';
import { Button, EmptyState, GoldRule, Loading, Overline, Text } from '../../../src/components/ui';
import { posthog } from '../../../src/config/posthog';
import { CapaTrilha, Etapas, Pilula, SeloVozes } from '../../../src/trilhas/componentes';
import { agendarLembretesDaTrilha } from '../../../src/trilhas/lembretes';
import {
  HORARIOS,
  descricaoDoDia,
  diasEntre,
  isoLocal,
  proximaSegunda,
  quandoLibera,
  rotuloHorario,
} from '../../../src/trilhas/regras';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fonts, radius, space, type Scheme } from '../../../src/theme/tokens';

function Chip({
  rotulo,
  icone,
  ativo,
  onPress,
}: {
  rotulo: string;
  icone?: keyof typeof Ionicons.glyphMap;
  ativo: boolean;
  onPress: () => void;
}) {
  const { scheme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativo }}
      style={[
        estilosFixos.chip,
        { borderColor: scheme.border, backgroundColor: scheme.surface },
        ativo && { borderColor: scheme.accent, backgroundColor: scheme.accentSubtle },
      ]}
    >
      {icone ? <Ionicons name={icone} size={13} color={ativo ? scheme.accent : scheme.textMuted} /> : null}
      <Text variant="micro" font={ativo ? 'bodySemi' : 'bodyMedium'} color={ativo ? scheme.accent : scheme.textSecondary}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

function Linha({
  dia,
  ultimo,
  descricao,
  onPress,
}: {
  dia: TrailDayItem;
  ultimo: boolean;
  descricao: string;
  onPress: () => void;
}) {
  const { scheme } = useTheme();
  const feito = dia.state === 'done';
  const aberto = dia.state === 'available';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Dia ${dia.number}: ${dia.title}. ${descricao}`} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={[
            estilosFixos.ponto,
            feito && { backgroundColor: scheme.gold },
            aberto && { backgroundColor: scheme.accent },
            !feito && !aberto && { backgroundColor: scheme.canvasWarm, borderWidth: 1, borderStyle: 'dashed', borderColor: scheme.textGhost },
          ]}
        >
          <Ionicons
            name={feito ? 'checkmark' : aberto ? 'book-outline' : 'lock-closed'}
            size={13}
            color={feito || aberto ? scheme.onAccent : scheme.textGhost}
          />
        </View>
        {!ultimo ? <View style={{ width: 1, flex: 1, backgroundColor: scheme.border, minHeight: 14 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: space.md }}>
        <Text style={{ fontFamily: fonts.serifSemi, fontSize: 16, lineHeight: 20, color: feito || aberto ? scheme.textPrimary : scheme.textMuted }}>
          {dia.title}
        </Text>
        <Text variant="micro" color={aberto ? scheme.accent : scheme.textMuted} style={{ marginTop: 2 }}>
          {`${dia.scripture_reference} · ${descricao}`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DetalheTrilha() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const insets = useSafeAreaInsets();

  const [trilha, setTrilha] = useState<TrailDetail | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [horario, setHorario] = useState<string>('07:00');
  const [inicio, setInicio] = useState<'today' | 'next_monday'>('today');
  const [comecando, setComecando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const registrouBloqueio = useRef(false);

  const hoje = new Date();
  const segunda = proximaSegunda(hoje);
  const hojeESegunda = hoje.getDay() === 1;

  const carregar = useCallback(async () => {
    try {
      const detalhe = await api.getTrail(slug);
      setTrilha(detalhe);
      setErro(null);
      if (detalhe.progress?.status === 'active') void agendarLembretesDaTrilha(detalhe);
      if (detalhe.locked && !registrouBloqueio.current) {
        registrouBloqueio.current = true;
        posthog?.capture('trail_locked_viewed', { trail: detalhe.slug, kind: detalhe.kind });
      }
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  useEffect(() => () => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
  }, []);

  function mostrarAviso(texto: string) {
    setAviso(texto);
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(() => setAviso(null), 4500);
  }

  async function comecar() {
    if (!trilha) return;
    if (trilha.locked) {
      router.push({ pathname: '/assinatura', params: { origem: 'trilha' } });
      return;
    }
    setComecando(true);
    try {
      const detalhe = await api.startTrail(trilha.slug, {
        start: inicio,
        reading_time: horario,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      setTrilha(detalhe);
      void agendarLembretesDaTrilha(detalhe, 'trail_started');
      if (inicio === 'today' && detalhe.days[0]?.state === 'available') {
        router.push({ pathname: '/trilha/[slug]/dia/[numero]', params: { slug: trilha.slug, numero: '1' } });
      }
    } catch (e) {
      mostrarAviso(mensagemDe(e));
    } finally {
      setComecando(false);
    }
  }

  function abrirDia(dia: TrailDayItem) {
    if (!trilha) return;
    if (dia.state === 'locked') {
      const limite = trilha.days.filter((d) => d.completed_on === isoLocal(hoje)).length >= 2;
      const foraDeOrdem = dia.number > (trilha.progress?.next_day ?? 1);
      posthog?.capture('trail_day_locked_tapped', {
        trail: trilha.slug,
        day: dia.number,
        reason: limite ? 'limite_diario' : foraDeOrdem ? 'fora_de_ordem' : 'ainda_bloqueado',
      });
      mostrarAviso(
        limite
          ? 'Você já leu 2 dias hoje. Volte amanhã para continuar.'
          : foraDeOrdem
            ? `Uma etapa por dia. ${quandoLibera(dia.unlocks_on, hoje)}.`
            : `${quandoLibera(dia.unlocks_on, hoje)}. Volte com calma, o texto rende mais assim.`,
      );
      return;
    }
    router.push({ pathname: '/trilha/[slug]/dia/[numero]', params: { slug: trilha.slug, numero: String(dia.number) } });
  }

  if (!trilha && !erro) return <Loading />;
  if (!trilha) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState icone="cloud-offline-outline" titulo="Não foi possível abrir a trilha" descricao={erro ?? undefined} />
      </SafeAreaView>
    );
  }

  const progresso = trilha.progress;
  const ativa = progresso?.status === 'active';
  const concluida = progresso?.status === 'completed';
  const disponivel = trilha.days.find((d) => d.state === 'available');
  const ultimoFeito = [...trilha.days].reverse().find((d) => d.state === 'done');
  const limiteHoje = trilha.days.filter((d) => d.completed_on === isoLocal(hoje)).length >= 2;
  const aindaNaoComecou = progresso ? diasEntre(hoje, new Date(progresso.start_date + 'T00:00:00')) > 0 : false;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={[]}>
      <Stack.Screen options={{ title: '' }} />
      {aviso ? (
        <View style={estilos.aviso} accessibilityLiveRegion="polite">
          <Ionicons name="hourglass-outline" size={18} color={scheme.goldSoft} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" font="bodySemi" color="#FFFFFF">
              Uma etapa por dia
            </Text>
            <Text variant="micro" color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
              {aviso}
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <CapaTrilha cover={trilha.cover} style={estilos.capa}>
          {trilha.kind === 'duas_vozes' ? (
            <View style={{ position: 'absolute', left: 14, top: 14 }}>
              <SeloVozes tamanho={26} />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pilula icone="calendar-outline" rotulo={`${trilha.days_count} dias`} />
            <Pilula icone="time-outline" rotulo={`${trilha.minutes_per_day} min por dia`} />
            <Pilula icone="ribbon-outline" rotulo={trilha.tier === 'free' ? 'Grátis' : 'Apoiador'} />
          </View>
        </CapaTrilha>

        <View style={{ paddingHorizontal: space.gutter }}>
          <Text variant="display" style={{ marginTop: space.lg }}>
            {trilha.name}
          </Text>
          <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.sm }}>
            {trilha.description}
          </Text>

          {ativa && progresso ? (
            <>
              <View style={{ marginTop: space.xl }}>
                <Etapas total={trilha.days_count} feitas={progresso.completed_days} atual={disponivel?.number} />
                <View style={estilos.etapasLegenda}>
                  <Text variant="micro" color={scheme.textMuted}>
                    {`Passo ${progresso.steps_done} de ${progresso.total_steps}`}
                  </Text>
                  <Text variant="micro" font="bodySemi" color={scheme.accent}>
                    {`${Math.round((progresso.steps_done / progresso.total_steps) * 100)}%`}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: space.xl }}>
                {trilha.days.map((dia, i) => (
                  <Linha
                    key={dia.number}
                    dia={dia}
                    ultimo={i === trilha.days.length - 1}
                    descricao={descricaoDoDia(dia, hoje, limiteHoje)}
                    onPress={() => abrirDia(dia)}
                  />
                ))}
              </View>

              {ultimoFeito?.hook && !disponivel ? (
                <View style={estilos.gancho}>
                  <Overline color={scheme.gold}>Amanhã</Overline>
                  <Text style={estilos.ganchoTexto}>{ultimoFeito.hook}</Text>
                </View>
              ) : null}

              {aindaNaoComecou ? (
                <View style={estilos.graca}>
                  <Ionicons name="calendar-outline" size={18} color={scheme.gold} />
                  <Text variant="caption" color={scheme.textSecondary} style={{ flex: 1 }}>
                    {`A trilha começa ${quandoLibera(progresso.start_date, hoje).replace('Libera ', '')}. Vamos te lembrar às ${rotuloHorario(progresso.reading_time)}.`}
                  </Text>
                </View>
              ) : (
                <View style={estilos.graca}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={scheme.gold} />
                  <Text variant="caption" color={scheme.textSecondary} style={{ flex: 1 }}>
                    {progresso.grace_available
                      ? 'Você tem 1 dia de graça. Se perder um dia, sua sequência na trilha continua.'
                      : 'Você usou seu dia de graça. Dá para recuperar até 2 dias por dia, sem perder a trilha.'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {concluida ? (
                <View style={estilos.graca}>
                  <Ionicons name="ribbon" size={18} color={scheme.gold} />
                  <Text variant="caption" color={scheme.textSecondary} style={{ flex: 1 }}>
                    {progresso?.badge
                      ? 'Você concluiu esta trilha no prazo e ganhou o selo. Pode refazê-la quando quiser.'
                      : 'Você concluiu esta trilha. Pode refazê-la quando quiser.'}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: space.lg }}>
                {trilha.days.slice(0, 3).map((dia) => (
                  <View key={dia.number} style={estilos.previa}>
                    <View style={estilos.previaNumero}>
                      <Text style={{ fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 18, color: scheme.gold }}>{dia.number}</Text>
                    </View>
                    <Text style={{ flex: 1, fontFamily: fonts.serifSemi, fontSize: 16, lineHeight: 20, color: scheme.textPrimary }} numberOfLines={1}>
                      {dia.title}
                    </Text>
                    <Text variant="micro" color={scheme.textMuted}>
                      {dia.scripture_reference}
                    </Text>
                  </View>
                ))}
                {trilha.days.length > 3 ? (
                  <Text variant="micro" color={scheme.textMuted} style={{ marginTop: space.sm, marginLeft: 38 }}>
                    {`e mais ${trilha.days.length - 3} dias`}
                  </Text>
                ) : null}
              </View>

              {!trilha.locked ? (
                <View style={estilos.pergunta}>
                  <Text variant="bodySm" font="bodySemi">
                    Quando você vai ler?
                  </Text>
                  <Text variant="micro" color={scheme.textMuted} style={{ marginTop: 2 }}>
                    Vamos te lembrar nesse horário.
                  </Text>
                  <View style={estilos.chips}>
                    {HORARIOS.map((h) => (
                      <Chip
                        key={h.valor}
                        rotulo={`${h.rotulo} · ${rotuloHorario(h.valor)}`}
                        icone={h.icone}
                        ativo={horario === h.valor}
                        onPress={() => setHorario(h.valor)}
                      />
                    ))}
                  </View>
                  <Text variant="bodySm" font="bodySemi" style={{ marginTop: space.lg }}>
                    Quando começar?
                  </Text>
                  <View style={estilos.chips}>
                    <Chip
                      rotulo={hojeESegunda ? 'Hoje · recomeço' : 'Hoje'}
                      icone={hojeESegunda ? 'sparkles-outline' : undefined}
                      ativo={inicio === 'today'}
                      onPress={() => setInicio('today')}
                    />
                    {!hojeESegunda ? (
                      <Chip
                        rotulo={`Segunda, ${String(segunda.getDate()).padStart(2, '0')}/${String(segunda.getMonth() + 1).padStart(2, '0')} · recomeço`}
                        icone="sparkles-outline"
                        ativo={inicio === 'next_monday'}
                        onPress={() => setInicio('next_monday')}
                      />
                    ) : null}
                  </View>
                </View>
              ) : null}
            </>
          )}
          <GoldRule width={48} style={{ marginTop: space.xxl }} />
        </View>
      </ScrollView>

      <View
        style={[
          estilos.rodape,
          { backgroundColor: scheme.canvas, borderTopColor: scheme.border, paddingBottom: insets.bottom + space.md },
        ]}
      >
        {ativa && disponivel ? (
          <Button
            label={`Ler o dia ${disponivel.number}`}
            icon="arrow-forward"
            onPress={() => abrirDia(disponivel)}
            style={{ backgroundColor: scheme.accent }}
          />
        ) : ativa ? (
          <Text variant="caption" color={scheme.textMuted} style={{ textAlign: 'center' }}>
            {progresso?.next_unlock_date
              ? `Próxima etapa: ${quandoLibera(progresso.next_unlock_date, hoje).replace('Libera ', '').toLowerCase()}.`
              : 'Tudo em dia por hoje.'}
          </Text>
        ) : (
          <>
            {!trilha.locked && !concluida ? (
              <Text variant="micro" color={scheme.textMuted} style={{ textAlign: 'center', marginBottom: space.sm }}>
                {`Passo 1 de ${trilha.days_count + 1} concluído: você escolheu a trilha.`}
              </Text>
            ) : null}
            <Button
              label={trilha.locked ? 'Seja Apoiador para começar' : concluida ? 'Refazer a trilha' : 'Começar a trilha'}
              icon={trilha.locked ? undefined : 'arrow-forward'}
              iconLeft={trilha.locked ? 'ribbon-outline' : undefined}
              loading={comecando}
              disabled={comecando}
              onPress={comecar}
              style={{ backgroundColor: trilha.locked ? scheme.gold : scheme.accent }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const estilosFixos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  ponto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    capa: {
      marginHorizontal: space.gutter,
      marginTop: space.sm,
      height: 104,
      borderRadius: radius.lg,
      justifyContent: 'flex-end',
      padding: 14,
    },
    etapasLegenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
    gancho: {
      marginTop: space.sm,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: scheme.goldSoft,
      backgroundColor: scheme.surface,
    },
    ganchoTexto: {
      fontFamily: fonts.serifItalic,
      fontSize: 17,
      lineHeight: 23,
      color: scheme.textSecondary,
      marginTop: 4,
    },
    graca: {
      marginTop: space.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: space.md,
      borderRadius: radius.md,
      backgroundColor: scheme.canvasWarm,
    },
    previa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: scheme.borderSoft,
    },
    previaNumero: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: scheme.goldSoft,
      backgroundColor: scheme.goldSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pergunta: {
      marginTop: space.xl,
      padding: space.lg,
      borderRadius: radius.md,
      backgroundColor: scheme.canvasWarm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
    aviso: {
      position: 'absolute',
      left: space.lg,
      right: space.lg,
      top: space.sm,
      zIndex: 10,
      flexDirection: 'row',
      gap: 10,
      padding: space.md,
      borderRadius: radius.md,
      backgroundColor: '#1F1B17',
    },
    rodape: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: space.gutter,
      paddingTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
  });
}
