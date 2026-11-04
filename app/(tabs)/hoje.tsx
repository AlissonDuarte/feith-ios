import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { NoteItem, Reflection, TrailCatalog } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { CoachTour, type PassoTour } from '../../src/components/CoachTour';
import { AccentHalo } from '../../src/components/ornaments';
import { Button, EmptyState, IconButton, Loading, Text, useEspacoTabBar } from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { consumirPaywallOnboarding, iniciarCalendarioAssinatura } from '../../src/iap/lembretesAssinatura';
import {
  diasDaSequencia,
  ehNoite,
  fraseCentral,
  isoDoDia,
  minutosDeLeitura,
  rotuloDaNota,
  ultimosSeteDias,
} from '../../src/leitura/regras';
import { useTourTarget } from '../../src/onboarding/TourTargets';
import { ConviteLembrete } from '../../src/push/ConviteLembrete';
import { useTheme } from '../../src/theme/ThemeContext';
import { colors, fonts, radius, space, type Scheme } from '../../src/theme/tokens';
import { AnelProgresso } from '../../src/trilhas/componentes';
import { reloadWidgets } from '../../src/widgets/reloadWidgets';

const TOUR_HOJE_KEY = 'feith.tour.hoje.v1';

function formatarData(data: Date): string {
  const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const curto = texto.replace('-feira', '');
  return curto.charAt(0).toUpperCase() + curto.slice(1);
}

export default function Hoje() {
  const { scheme, effectiveMode } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const router = useRouter();
  const { summary, refreshSummary, isSupporter } = useAuth();
  const { respiro } = useEspacoTabBar();
  const focado = useIsFocused();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [tourVisivel, setTourVisivel] = useState(false);
  const [trilhas, setTrilhas] = useState<TrailCatalog | null>(null);
  const [trilhaDiaDisponivel, setTrilhaDiaDisponivel] = useState(false);
  const [nota, setNota] = useState<NoteItem | null>(null);
  const [lidos, setLidos] = useState<Set<string> | null>(null);

  const refHero = useRef<View>(null);
  const refFormas = useRef<View>(null);
  const refSemana = useRef<View>(null);
  const refCartao = useTourTarget('cartao_compartilhar', {
    onPress: () => {
      if (reflexao?.uuid) router.push(`/leitura/compartilhar-cartao?key=${reflexao.uuid}`);
    },
  });

  const contexto = useRef({ isSupporter });
  contexto.current = { isSupporter };

  useEffect(() => {
    void iniciarCalendarioAssinatura();
  }, []);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setReflexao(await api.getDailyReflection());
      await refreshSummary();
      void reloadWidgets();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [refreshSummary]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      if (consumirPaywallOnboarding() && !contexto.current.isSupporter) {
        router.push({ pathname: '/assinatura', params: { origem: 'onboarding' } });
      }

      let ativo = true;
      void refreshSummary();
      setTrilhaDiaDisponivel(false);
      api
        .getTrails()
        .then((catalogo) => {
          if (!ativo) return;
          setTrilhas(catalogo);
          const slug = catalogo.active?.slug;
          if (!slug) return;
          api
            .getTrail(slug)
            .then((detalhe) => {
              if (ativo) setTrilhaDiaDisponivel(detalhe.days.some((dia) => dia.state === 'available'));
            })
            .catch(() => {
              if (ativo) setTrilhaDiaDisponivel(false);
            });
        })
        .catch(() => undefined);

      api
        .getNotes({ page: 1, page_size: 1 })
        .then((pagina) => {
          if (ativo) setNota(pagina.items[0] ?? null);
        })
        .catch(() => undefined);

      const agora = new Date();
      const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 6);
      const meses = [inicio, agora].filter(
        (d, i, lista) => i === 0 || d.getMonth() !== lista[0].getMonth(),
      );
      Promise.all(meses.map((d) => api.getStreakCalendar(d.getFullYear(), d.getMonth() + 1)))
        .then((respostas) => {
          if (!ativo) return;
          setLidos(
            new Set(
              respostas.flatMap((r) =>
                r.days_read.map((dia) => isoDoDia(new Date(r.year, r.month - 1, dia))),
              ),
            ),
          );
        })
        .catch(() => undefined);

      return () => {
        ativo = false;
      };
    }, [refreshSummary, router]),
  );

  const estadoDaHoje = useRef({ leu_hoje: false, tem_ideia_central: false, sequencia: 0 });
  estadoDaHoje.current = {
    leu_hoje: summary?.read_today ?? false,
    tem_ideia_central: Boolean(reflexao?.core_idea?.trim()),
    sequencia: summary?.streak ?? 0,
  };
  const temResumo = Boolean(summary);
  const reflexaoDeHoje = reflexao?.uuid;
  useEffect(() => {
    if (!focado || !reflexaoDeHoje || !temResumo) return;
    posthog?.capture('hoje_viewed', { ...estadoDaHoje.current, noite: ehNoite(new Date()) });
  }, [focado, reflexaoDeHoje, temResumo]);

  useEffect(() => {
    if (!reflexao?.uuid) return;
    AsyncStorage.getItem(TOUR_HOJE_KEY)
      .then((visto) => {
        if (!visto) {
          setTourVisivel(true);
          posthog?.capture('coach_tour_hoje_shown');
        }
      })
      .catch(() => undefined);
  }, [reflexao?.uuid]);

  function concluirTour(metodo: 'completed' | 'skipped') {
    setTourVisivel(false);
    void AsyncStorage.setItem(TOUR_HOJE_KEY, '1');
    posthog?.capture('coach_tour_hoje_completed', { completion_method: metodo });
  }

  const puxarParaAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível carregar"
          descricao={erro}
          acao={<Button label="Tentar de novo" onPress={puxarParaAtualizar} />}
        />
      </SafeAreaView>
    );
  }

  if (!reflexao || !reflexao.uuid) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="hourglass-outline"
          titulo="A reflexão de hoje ainda não saiu"
          descricao="Assim que ela for publicada, você a encontra aqui. Enquanto isso, seu acervo continua disponível."
          acao={<Button label="Atualizar" variant="secondary" onPress={puxarParaAtualizar} />}
        />
      </SafeAreaView>
    );
  }

  const agora = new Date();
  const noite = ehNoite(agora);
  const streak = summary?.streak ?? 0;
  const leuHoje = summary?.read_today ?? false;
  const dias = ultimosSeteDias(agora, lidos ?? diasDaSequencia(agora, streak, leuHoje));
  const temIdeia = Boolean(reflexao.core_idea?.trim());
  const minutos = minutosDeLeitura([
    reflexao.bible_text,
    reflexao.context,
    reflexao.exegesis,
    reflexao.doctrine,
    reflexao.application,
    reflexao.prayer,
  ]);
  const frase = fraseCentral(reflexao.core_idea);
  const ativa = trilhas?.active;
  const destaque = effectiveMode === 'dark' ? scheme.gold : colors.streak;

  const rotulo = leuHoje
    ? 'Leitura de hoje concluída'
    : noite && streak > 0
      ? `Falta hoje para ${streak + 1} dias`
      : 'Reflexão de hoje';
  const acaoPrincipal = !temIdeia
    ? `Ler a reflexão · ${minutos} min`
    : leuHoje
      ? 'Ler de novo em 1 minuto'
      : noite
        ? 'Ler em 1 minuto antes de dormir'
        : 'Ler em 1 minuto';

  const abrir = (params: Record<string, string>) => {
    router.push({ pathname: '/leitura/[key]', params: { key: reflexao.uuid, hoje: '1', ...params } });
  };

  const passosTour: PassoTour[] = [
    {
      ref: refHero,
      titulo: 'A reflexão de hoje',
      corpo: 'Comece pela ideia central em 1 minuto. Quando quiser ir além, as 5 etapas estão a um toque.',
    },
    {
      ref: refFormas,
      titulo: 'Ouça ou aprofunde',
      corpo: 'Escolha entre ouvir a versão narrada e ler o estudo completo.',
    },
    {
      ref: refSemana,
      titulo: 'Sua sequência',
      corpo: 'Cada dia lido entra aqui. Toque para ver o calendário e os seus marcos.',
    },
  ];

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <AccentHalo height={noite ? 340 : 240} opacity={noite ? 1 : 0.45} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: respiro, paddingTop: space.sm }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={puxarParaAtualizar} tintColor={scheme.accent} />
        }
      >
        <View style={estilos.topo}>
          <Text variant="bodySm" font="bodyMedium" color={scheme.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
            {noite ? `Boa noite · ${formatarData(agora).toLowerCase()}` : formatarData(agora)}
          </Text>
          {!isSupporter ? (
            <Pressable
              onPress={() => router.push({ pathname: '/assinatura', params: { origem: 'hoje_badge' } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Conhecer plano Apoiador"
              style={estilos.apoiador}
            >
              <Ionicons name="ribbon-outline" size={15} color={scheme.gold} />
              <Text variant="caption" font="bodySemi" color={scheme.gold}>
                Apoiador
              </Text>
            </Pressable>
          ) : noite ? (
            <Ionicons name="moon-outline" size={18} color={scheme.gold} />
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            posthog?.capture('hoje_action_tapped', { acao: 'sequencia' });
            router.push('/perfil/sequencia');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Sua sequência: ${streak} dias`}
        >
          <View ref={refSemana} collapsable={false} style={estilos.semana}>
            <View style={estilos.semanaTexto}>
              <Ionicons name="flame" size={18} color={destaque} />
              <Text variant="caption" font="bodySemi" numberOfLines={1} style={{ flexShrink: 1 }}>
                {streak > 0 ? `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : 'Comece hoje'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {dias.map((dia) => (
                <View
                  key={dia.iso}
                  style={[
                    estilos.dia,
                    dia.lido && { backgroundColor: destaque },
                    !dia.lido && dia.hoje && { borderWidth: 1.5, borderColor: scheme.accent },
                    !dia.lido && !dia.hoje && { backgroundColor: scheme.canvasWarm },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: fonts.bodySemi,
                      fontSize: 11,
                      lineHeight: 13,
                      color: dia.lido ? scheme.canvas : dia.hoje ? scheme.accent : scheme.textGhost,
                    }}
                  >
                    {dia.letra}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Pressable>

        <View ref={refHero} collapsable={false} style={{ marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="overline" font="bodySemi" color={scheme.gold} style={{ flex: 1 }}>
              {rotulo}
            </Text>
            <View ref={refCartao}>
              <IconButton
                name="image-outline"
                label="Cartão para compartilhar"
                size={17}
                onPress={() => router.push(`/leitura/compartilhar-cartao?key=${reflexao.uuid}`)}
              />
            </View>
          </View>
          <Text variant="hero" accessibilityRole="header" style={{ marginTop: 2 }}>
            {reflexao.scripture_reference}
          </Text>
          <Text numberOfLines={4} style={estilos.versiculo}>
            {reflexao.bible_text}
          </Text>
          {frase ? (
            <Text color={scheme.textSecondary} style={estilos.frase}>
              {frase}
            </Text>
          ) : null}
          {reflexao.readers_today > 1 ? (
            <Text variant="micro" color={scheme.textMuted} style={{ marginTop: space.sm }}>
              {`${reflexao.readers_today} pessoas leram hoje`}
            </Text>
          ) : null}
        </View>

        <Button
          label={acaoPrincipal}
          icon="arrow-forward"
          style={{ marginTop: space.lg }}
          onPress={() => {
            posthog?.capture('hoje_cta_tapped', { acao: temIdeia ? 'curta' : 'etapas', noite, leu_hoje: leuHoje, sequencia: streak });
            abrir({ modo: temIdeia ? 'curta' : 'etapas' });
          }}
        />

        <View ref={refFormas} collapsable={false} style={estilos.formas}>
          <Forma
            icone="headset"
            titulo="Ouvir"
            legenda={isSupporter ? 'Versão narrada' : 'Amostra grátis'}
            onPress={() => {
              posthog?.capture('hoje_audio_tapped');
              abrir({ modo: temIdeia ? 'curta' : 'etapas', ouvir: '1' });
            }}
          />
          {noite ? (
            <Forma
              icone="hand-left-outline"
              titulo="Oração final"
              legenda="Para encerrar o dia"
              onPress={() => {
                posthog?.capture('hoje_action_tapped', { acao: 'oracao_final', noite });
                abrir({ modo: 'etapas', etapa: 'prayer' });
              }}
            />
          ) : (
            <Forma
              icone="layers"
              titulo="5 etapas"
              legenda={`${minutos} min de leitura`}
              onPress={() => {
                posthog?.capture('hoje_action_tapped', { acao: 'etapas', noite });
                abrir({ modo: 'etapas' });
              }}
            />
          )}
        </View>

        {ativa?.progress && trilhaDiaDisponivel ? (
          <Pressable
            onPress={() => {
              posthog?.capture('trail_continue_tapped', { trail: ativa.slug, source: 'hoje' });
              router.push({ pathname: '/trilha/[slug]', params: { slug: ativa.slug } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Continuar trilha ${ativa.name}`}
          >
            {({ pressed }) => (
              <View style={[estilos.cartao, { marginTop: space.lg }, pressed && { opacity: 0.85 }]}>
                <AnelProgresso feitos={ativa.progress!.completed_days} total={ativa.days_count} tamanho={46} quieto />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="overline" font="bodySemi" color={scheme.gold}>
                    Continuar trilha
                  </Text>
                  <Text style={estilos.cartaoTitulo} numberOfLines={1}>
                    {ativa.name}
                  </Text>
                  {trilhas?.active_next_title ? (
                    <Text variant="micro" color={scheme.textMuted} numberOfLines={1}>
                      {`Dia ${ativa.progress!.next_day} · ${trilhas.active_next_title} · ${ativa.minutes_per_day} min`}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={scheme.textGhost} />
              </View>
            )}
          </Pressable>
        ) : null}

        {nota ? (
          <Pressable
            onPress={() => {
              posthog?.capture('hoje_action_tapped', { acao: 'ultima_nota' });
              router.push(`/leitura/${nota.reflection_uuid}`);
            }}
            accessibilityRole="button"
            accessibilityLabel="Abrir a reflexão da sua última anotação"
          >
            {({ pressed }) => (
              <View style={[estilos.nota, pressed && { opacity: 0.85 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="create-outline" size={15} color={scheme.gold} />
                  <Text variant="overline" font="bodySemi" color={scheme.gold} style={{ flex: 1 }}>
                    {rotuloDaNota(nota.createdAt, agora)}
                  </Text>
                  <Text variant="micro" color={scheme.textMuted}>
                    {nota.reflection_verse}
                  </Text>
                </View>
                <Text numberOfLines={2} style={estilos.notaTexto}>
                  {nota.note}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}

        <ConviteLembrete
          streak={streak}
          hora={(summary?.notification_schedule as { time?: string } | undefined)?.time || '21:30'}
        />
      </ScrollView>

      <CoachTour visivel={tourVisivel && focado} passos={passosTour} onConcluir={concluirTour} />
    </SafeAreaView>
  );
}

function Forma({
  icone,
  titulo,
  legenda,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  legenda: string;
  onPress: () => void;
}) {
  const { scheme } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${titulo}. ${legenda}`} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            minHeight: 62,
            paddingHorizontal: 10,
            borderRadius: radius.sharp,
            borderWidth: 1,
            borderColor: scheme.border,
            backgroundColor: pressed ? scheme.canvasWarm : scheme.surface,
          }}
        >
          <Ionicons name={icone} size={22} color={scheme.accent} />
          <View style={{ flexShrink: 1 }}>
            <Text variant="bodySm" font="bodySemi" numberOfLines={1}>
              {titulo}
            </Text>
            <Text variant="micro" color={scheme.textMuted} numberOfLines={1}>
              {legenda}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: scheme.canvas },
    topo: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 34 },
    apoiador: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    semana: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.md,
      marginTop: space.sm,
      paddingVertical: space.md,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: scheme.borderSoft,
      backgroundColor: scheme.surface,
    },
    semanaTexto: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    dia: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    versiculo: {
      fontFamily: fonts.serif,
      fontSize: 24,
      lineHeight: 33,
      color: scheme.textPrimary,
      marginTop: space.sm,
    },
    frase: { fontFamily: fonts.body, fontSize: 16, lineHeight: 25, marginTop: space.sm },
    formas: { flexDirection: 'row', gap: 10, marginTop: 10 },
    cartao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: scheme.borderSoft,
      backgroundColor: scheme.surface,
    },
    cartaoTitulo: {
      fontFamily: fonts.serifSemi,
      fontSize: 21,
      lineHeight: 25,
      color: scheme.textPrimary,
    },
    nota: {
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: radius.sm,
      backgroundColor: scheme.canvasWarm,
    },
    notaTexto: {
      fontFamily: fonts.serifItalic,
      fontSize: 20,
      lineHeight: 26,
      color: scheme.textPrimary,
      marginTop: 5,
    },
  });
}
