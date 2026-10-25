import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection, TrailCatalog } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { CoachTour, type PassoTour } from '../../src/components/CoachTour';
import { NotaSheet } from '../../src/components/NotaSheet';
import { AccentHalo } from '../../src/components/ornaments';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import { posthog } from '../../src/config/posthog';
import { useRastreioDeLeitura } from '../../src/config/useRastreioDeLeitura';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Loading,
  Overline,
  Text,
  useEspacoTabBar,
} from '../../src/components/ui';
import {
  iniciarCalendarioAssinatura,
  lembreteAssinaturaDevido,
} from '../../src/iap/lembretesAssinatura';
import { ALTURA_BARRA_AUDIO, PlayerAudio } from '../../src/player/PlayerAudio';
import { ConviteLembrete } from '../../src/push/ConviteLembrete';
import { useTourTarget } from '../../src/onboarding/TourTargets';
import { AnelProgresso } from '../../src/trilhas/componentes';
import { useTheme } from '../../src/theme/ThemeContext';
import { radius, shadow, space, type Scheme } from '../../src/theme/tokens';
import { reloadWidgets } from '../../src/widgets/reloadWidgets';

const TOUR_HOJE_KEY = 'feith.tour.hoje.v1';

export default function Hoje() {
  const { scheme, effectiveMode } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const router = useRouter();
  // O streak vem do summary do AuthContext, que ja e compartilhado por todas
  // as telas — buscar /streaks/me aqui seria a mesma duplicacao que a web faz.
  const { summary, refreshSummary, isSupporter } = useAuth();
  const { altura: alturaTabBar, respiro } = useEspacoTabBar();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);
  const [prefixoNota, setPrefixoNota] = useState<string | undefined>(undefined);
  const [tourVisivel, setTourVisivel] = useState(false);
  const [trilhas, setTrilhas] = useState<TrailCatalog | null>(null);
  const [trilhaDiaDisponivel, setTrilhaDiaDisponivel] = useState(false);
  const { paywall } = useLocalSearchParams<{ paywall?: string }>();
  const focado = useIsFocused();

  const contexto = useRef({ focado, escrevendo, tourVisivel, isSupporter });
  contexto.current = { focado, escrevendo, tourVisivel, isSupporter };
  const timerLembrete = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoLer = useCallback(() => {
    if (contexto.current.isSupporter) return;
    void lembreteAssinaturaDevido().then((marco) => {
      if (!marco) return;
      if (timerLembrete.current) clearTimeout(timerLembrete.current);
      timerLembrete.current = setTimeout(() => {
        const c = contexto.current;
        if (c.isSupporter || !c.focado || c.escrevendo || c.tourVisivel) return;
        if (AppState.currentState !== 'active') return;
        router.push({ pathname: '/assinatura', params: { origem: 'lembrete', marco } });
      }, 2500);
    });
  }, [router]);

  const rastreio = useRastreioDeLeitura(reflexao, 'hoje', aoLer);

  useEffect(() => {
    void iniciarCalendarioAssinatura();
    return () => {
      if (timerLembrete.current) clearTimeout(timerLembrete.current);
    };
  }, []);

  const paywallOnboardingAberto = useRef(false);

  useEffect(() => {
    if (paywall !== 'onboarding' || paywallOnboardingAberto.current) return;
    paywallOnboardingAberto.current = true;
    router.setParams({ paywall: undefined });
    router.push({ pathname: '/assinatura', params: { origem: 'onboarding' } });
  }, [paywall, router]);

  const refCorpo = useRef<View>(null);
  const refCapsula = useRef<View>(null);
  const refBarra = useRef<View>(null);
  // Alvo do walkthrough guiado de feature (servidor), nao do CoachTour local
  // acima — por isso e um useTourTarget e nao mais um useRef<View>(null).
  const refCartaoCompartilhar = useTourTarget('cartao_compartilhar', {
    onPress: () => {
      if (!reflexao?.uuid) return;
      router.push(`/leitura/compartilhar-cartao?key=${reflexao.uuid}`);
    },
  });

  const passosTour: PassoTour[] = [
    {
      ref: refCorpo,
      titulo: 'A reflexão de hoje',
      corpo: 'Contexto, exegese e doutrina em três camadas — uma leitura de 5 a 10 minutos.',
    },
    {
      ref: refCapsula,
      titulo: 'Ouça ou anote',
      corpo: 'Toque no play para ouvir a versão narrada (Apoiador) ou em Anotar para registrar um pensamento.',
    },
    {
      ref: refBarra,
      titulo: 'Guarde para depois',
      corpo: 'O marcador guarda a reflexão em Favoritos; o ícone ao lado compartilha com alguém.',
    },
  ];

  function concluirTour(metodo: 'completed' | 'skipped') {
    setTourVisivel(false);
    void AsyncStorage.setItem(TOUR_HOJE_KEY, '1');
    posthog?.capture('coach_tour_hoje_completed', { completion_method: metodo });
  }

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const daily = await api.getDailyReflection();
      setReflexao(daily);

      // Este GET tem efeito colateral: ele registra a leitura de hoje
      // (reflection_views.py:37), que e o que alimenta o streak. Recarregar o
      // summary DEPOIS dele — e nunca antes — e o que faz o contador subir no
      // mesmo instante em que a pessoa abre a reflexao.
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
      let ativo = true;
      setTrilhaDiaDisponivel(false);
      api
        .getTrails()
        .then((catalogo) => {
          if (!ativo) return;
          setTrilhas(catalogo);
          const slug = catalogo.active?.slug;
          if (!slug) return;
          // So existe um campo autoritativo de disponibilidade (que considera
          // o limite diario de dias concluidos) no detalhe da trilha — ver
          // trail_rules.estados() no backend. Sem essa confirmacao, o botao
          // fica escondido (falha fechada) em vez de assumir que ha dia pendente.
          api
            .getTrail(slug)
            .then((detalhe) => {
              if (!ativo) return;
              setTrilhaDiaDisponivel(detalhe.days.some((dia) => dia.state === 'available'));
            })
            .catch(() => {
              if (ativo) setTrilhaDiaDisponivel(false);
            });
        })
        .catch(() => undefined);
      return () => {
        ativo = false;
      };
    }, []),
  );

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

  const compartilhar = useCallback(async () => {
    if (!reflexao?.uuid) return;
    try {
      const link = await api.createShareLink(reflexao.uuid);
      const trecho = reflexao.bible_text?.trim()
        ? `"${reflexao.bible_text.length > 200 ? reflexao.bible_text.slice(0, 200).trim() + '...' : reflexao.bible_text.trim()}"\n\n`
        : '';

      await Share.share(
        {
          title: `${reflexao.scripture_reference} — feith`,
          message: `📖 ${reflexao.scripture_reference}\n\n${trecho}Leia a reflexão e exegese completa no feith:\n${link.url}`,
          url: link.url,
        },
        {
          subject: `${reflexao.scripture_reference} — feith`,
        },
      );
      posthog?.capture('reflection_shared', { source: 'daily_reflection' });
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [reflexao]);

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

  // Quando nao ha reflexao publicada, o backend NAO devolve 404: ele devolve
  // todos os campos em branco com uuid vazio (reflection_service.py:39-51).
  // Sem este ramo, a tela renderizaria cards vazios e pareceria quebrada — que
  // e exatamente o que um revisor da App Store veria num dia sem conteudo.
  if (!reflexao || !reflexao.uuid) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="hourglass-outline"
          titulo="A reflexão de hoje ainda não saiu"
          descricao="Assim que ela for publicada, você a encontra aqui. Enquanto isso, seu histórico continua disponível."
          acao={
            <Button label="Atualizar" variant="secondary" onPress={puxarParaAtualizar} />
          }
        />
      </SafeAreaView>
    );
  }

  const streak = summary?.streak ?? 0;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      {/* Halo de oxblood atras da abertura — o mesmo do hero da landing. Da
          profundidade ao topo da pagina sem colocar nada nele. */}
      <AccentHalo height={360} />

      {/* ── Barra superior ────────────────────────────────────────────────
          Sem titulo: o titulo da tela e a propria referencia biblica, logo
          abaixo. Repetir "Hoje" aqui gastaria a linha mais nobre da tela. */}
      <View ref={refBarra} style={estilos.barra}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {streak > 0 ? (
            <View style={estilos.streak}>
              <Ionicons name="flame" size={12} color={scheme.gold} />
              <Text variant="micro" font="bodySemi" color={scheme.gold}>
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </Text>
            </View>
          ) : null}

          {!isSupporter ? (
            <Pressable
              onPress={() => router.push({ pathname: '/assinatura', params: { origem: 'hoje_badge' } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Conhecer plano Apoiador"
            >
              {({ pressed }) => (
                <View style={[estilos.badgeApoiador, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="ribbon-outline" size={12} color={scheme.gold} />
                  <Text variant="micro" font="bodySemi" color={scheme.gold} style={{ letterSpacing: 1 }}>
                    APOIADOR
                  </Text>
                </View>
              )}
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <BotaoFavorito
            reflectionUuid={reflexao.uuid}
            favoritado={reflexao.bookmarked}
            onMudou={(v) => setReflexao((r) => (r ? { ...r, bookmarked: v } : r))}
            emMoldura
          />
          <View ref={refCartaoCompartilhar}>
            <IconButton
              name="image-outline"
              label="Cartão para compartilhar"
              onPress={() => router.push(`/leitura/compartilhar-cartao?key=${reflexao.uuid}`)}
            />
          </View>
          <IconButton name="share-outline" label="Compartilhar" onPress={compartilhar} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingBottom: respiro + ALTURA_BARRA_AUDIO,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={rastreio.onScroll}
        scrollEventThrottle={rastreio.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={puxarParaAtualizar}
            tintColor={scheme.accent}
          />
        }
      >
        <View ref={refCorpo} onLayout={rastreio.onLayoutTexto}>
          <ReflexaoReader
            reflexao={reflexao}
            abaixoDoTitulo={
              reflexao.readers_today > 0 ? (
                <View style={estilos.leitores}>
                  <Ionicons name="people-outline" size={12} color={scheme.textMuted} />
                  <Text variant="micro" color={scheme.textMuted}>
                    {reflexao.readers_today} {reflexao.readers_today === 1 ? 'pessoa leu' : 'pessoas leram'} esta reflexão hoje
                  </Text>
                </View>
              ) : null
            }
          />
        </View>

        {trilhas?.active?.progress && trilhaDiaDisponivel ? (
          <Pressable
            onPress={() => {
              posthog?.capture('trail_continue_tapped', { trail: trilhas.active?.slug ?? null, source: 'hoje' });
              router.push({ pathname: '/trilha/[slug]', params: { slug: trilhas.active!.slug } });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Continuar trilha ${trilhas.active.name}`}
          >
            {({ pressed }) => {
              const corDestaque = effectiveMode === 'dark' ? scheme.onAccentMuted : scheme.goldSoft;
              return (
                <View style={[estilos.trilha, pressed && { opacity: 0.9 }]}>
                  <AnelProgresso feitos={trilhas.active!.progress!.completed_days} total={trilhas.active!.days_count} tamanho={44} />
                  <View style={{ flex: 1 }}>
                    <Text variant="micro" font="bodySemi" color={corDestaque} style={{ letterSpacing: 2 }}>
                      CONTINUAR TRILHA
                    </Text>
                    <Text variant="title" color={scheme.onAccent} numberOfLines={1}>
                      {trilhas.active!.name}
                    </Text>
                    {trilhas.active_next_title ? (
                      <Text variant="micro" color={scheme.onAccentMuted} numberOfLines={1}>
                        {`Dia ${trilhas.active!.progress!.next_day} · ${trilhas.active_next_title}`}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={corDestaque} />
                </View>
              );
            }}
          </Pressable>
        ) : null}

        <ConviteLembrete
          streak={streak}
          hora={(summary?.notification_schedule as { time?: string } | undefined)?.time || '08:00'}
        />

        {!isSupporter ? (
          <Card quiet style={{ marginTop: space.xxl, marginBottom: space.lg, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="ribbon-outline" size={14} color={scheme.gold} />
              <Overline color={scheme.gold}>Plano Apoiador</Overline>
            </View>
            <Text variant="caption" color={scheme.textSecondary} style={{ textAlign: 'center', marginTop: 2 }}>
              Aprofunde seu momento diário com áudio narrado e acervo completo.
            </Text>
            <Button
              label="Conhecer plano Apoiador"
              variant="ghost"
              size="sm"
              icon="arrow-forward"
              style={{ marginTop: space.sm }}
              onPress={() => router.push({ pathname: '/assinatura', params: { origem: 'hoje_card' } })}
            />
          </Card>
        ) : null}
      </ScrollView>

      <View
        ref={refCapsula}
        style={[estilos.ancora, { bottom: alturaTabBar + space.md }]}
        pointerEvents="box-none"
      >
        <PlayerAudio
          reflectionUuid={reflexao.uuid}
          referencia={reflexao.scripture_reference}
          onAnotar={(prefixo) => {
            setPrefixoNota(prefixo);
            setEscrevendo(true);
          }}
          aoConcluir={aoLer}
        />
      </View>

      <NotaSheet
        visivel={escrevendo}
        textoInicial={prefixoNota}
        reflectionUuid={reflexao.uuid}
        onFechar={() => setEscrevendo(false)}
        onSalvou={() => setEscrevendo(false)}
      />

      <CoachTour visivel={tourVisivel && focado} passos={passosTour} onConcluir={concluirTour} />
    </SafeAreaView>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
  tela: { flex: 1, backgroundColor: scheme.canvas },
  trilha: {
    marginTop: space.xxl,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: scheme.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: scheme.goldSoft,
    backgroundColor: scheme.goldSubtle,
    borderRadius: radius.sharp,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  leitores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: space.md,
  },
  badgeApoiador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(139,105,20,0.30)',
    backgroundColor: 'rgba(139,105,20,0.08)',
    borderRadius: radius.sharp,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ancora: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    zIndex: 99,
    elevation: 10,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.sharp,
    backgroundColor: scheme.accent,
    ...shadow.raised,
  },
  fabPressed: {
    backgroundColor: scheme.accentPressed,
    opacity: 0.9,
  },
  });
}
