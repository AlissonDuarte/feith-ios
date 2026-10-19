import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../../../src/api/client';
import { mensagemDe } from '../../../../src/api/errors';
import { ApiError, type Reflection, type TrailCompleteResult, type TrailDayContent } from '../../../../src/api/types';
import { NotaSheet } from '../../../../src/components/NotaSheet';
import { ReflexaoReader } from '../../../../src/components/ReflexaoReader';
import { Button, EmptyState, IconButton, Loading, Overline, Text } from '../../../../src/components/ui';
import { posthog } from '../../../../src/config/posthog';
import { useRastreioDeLeitura } from '../../../../src/config/useRastreioDeLeitura';
import { ALTURA_BARRA_AUDIO, PlayerAudio } from '../../../../src/player/PlayerAudio';
import { COR_PROTESTANTE, Etapas } from '../../../../src/trilhas/componentes';
import { agendarLembretesDaTrilha } from '../../../../src/trilhas/lembretes';
import { codigoDoBloqueio, mensagemDoBloqueio } from '../../../../src/trilhas/regras';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { fonts, radius, space, type Scheme } from '../../../../src/theme/tokens';

function Voz({
  titulo,
  fonte,
  texto,
  cor,
}: {
  titulo: string;
  fonte: string | null;
  texto: string;
  cor: string;
}) {
  const { scheme } = useTheme();
  return (
    <View
      style={{
        marginTop: space.md,
        padding: space.lg,
        borderRadius: radius.md,
        backgroundColor: scheme.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: scheme.border,
        borderLeftWidth: 3,
        borderLeftColor: cor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
        <Overline color={cor}>{titulo}</Overline>
        {fonte ? (
          <Text variant="micro" color={scheme.textMuted} style={{ flexShrink: 1, textAlign: 'right' }}>
            {fonte}
          </Text>
        ) : null}
      </View>
      <Text variant="bodySm" color={scheme.textPrimary} style={{ marginTop: space.sm }}>
        {texto}
      </Text>
    </View>
  );
}

export default function DiaDaTrilha() {
  const { slug, numero } = useLocalSearchParams<{ slug: string; numero: string }>();
  const n = Number(numero);
  const router = useRouter();
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);

  const [dia, setDia] = useState<TrailDayContent | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<TrailCompleteResult | null>(null);
  const [anotando, setAnotando] = useState(false);
  const [prefixoNota, setPrefixoNota] = useState<string | undefined>(undefined);
  const abertoEm = useRef(0);
  const enviando = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .getTrailDay(slug, n)
      .then((conteudo) => {
        if (!ativo) return;
        abertoEm.current = Date.now();
        setDia(conteudo);
      })
      .catch((e) => {
        if (!ativo) return;
        const bloqueio = e instanceof ApiError && e.status === 423 ? codigoDoBloqueio(e.data) : null;
        setErro(bloqueio ? mensagemDoBloqueio(bloqueio.code, bloqueio.unlocks_on, new Date()) : mensagemDe(e));
      });
    return () => {
      ativo = false;
      if (retry.current) clearTimeout(retry.current);
    };
  }, [slug, n]);

  const concluir = useCallback(async () => {
    if (!dia || dia.completed || enviando.current) return;
    enviando.current = true;
    try {
      const r = await api.completeTrailDay(slug, n);
      setResultado(r);
      setDia((d) => (d ? { ...d, completed: true } : d));
      void api
        .getTrail(slug)
        .then((detalhe) => agendarLembretesDaTrilha(detalhe, 'trail_day_completed'))
        .catch(() => undefined);
      if (r.trail_completed) {
        router.replace({
          pathname: '/trilha/[slug]/concluida',
          params: {
            slug,
            dias: String(r.stats?.days ?? dia.total_days),
            minutos: String(r.stats?.minutes ?? 0),
            notas: String(r.stats?.notes ?? 0),
            selo: r.progress.badge ? '1' : '0',
            proxima: r.next_trail?.slug ?? '',
          },
        });
      }
    } catch (e) {
      const bloqueio = e instanceof ApiError && e.status === 423 ? codigoDoBloqueio(e.data) : null;
      if (bloqueio?.code === 'rapido_demais') {
        const espera = abertoEm.current + dia.min_read_seconds * 1000 + 1500 - Date.now();
        retry.current = setTimeout(() => void concluir(), Math.max(1500, espera));
      } else {
        posthog?.capture('trail_day_complete_failed', { trail: slug, day: n, code: bloqueio?.code ?? 'erro' });
      }
    } finally {
      enviando.current = false;
    }
  }, [dia, slug, n, router]);

  const comoReflexao = useMemo<Reflection | null>(
    () =>
      dia
        ? {
            uuid: dia.reflection_uuid ?? `${slug}-${n}`,
            scripture_reference: dia.scripture_reference,
            version: dia.version ?? '',
            bible_text: dia.bible_text ?? '',
            context: dia.context ?? '',
            exegesis: dia.exegesis ?? '',
            doctrine: '',
            application: dia.application ?? '',
            prayer: dia.prayer ?? '',
            bookmarked: false,
            publish_at: '',
            publishAt: null,
            readers_today: 0,
            comments_count: 0,
          }
        : null,
    [dia, slug, n],
  );

  const rastreio = useRastreioDeLeitura(comoReflexao, 'trilha', concluir, dia?.min_read_seconds, 0.6);

  if (!dia && !erro) return <Loading />;

  if (!dia || !comoReflexao) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
        <Stack.Screen options={{ title: `Dia ${n}` }} />
        <EmptyState
          icone="hourglass-outline"
          titulo="Uma etapa por dia"
          descricao={erro ?? undefined}
          acao={<Button label="Voltar à trilha" variant="quiet" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const duasVozes = dia.kind === 'duas_vozes' && (dia.common_ground || dia.protestant_view || dia.catholic_view);
  const feitas = dia.completed ? dia.number : dia.number - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: `Dia ${dia.number} de ${dia.total_days}`,
          headerRight: dia.reflection_uuid
            ? () => <IconButton name="create-outline" label="Anotar" onPress={() => setAnotando(true)} />
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingBottom: space.section * 2 + (dia.reflection_uuid ? ALTURA_BARRA_AUDIO : 0),
        }}
        showsVerticalScrollIndicator={false}
        onScroll={rastreio.onScroll}
        scrollEventThrottle={rastreio.scrollEventThrottle}
      >
        <View style={{ marginTop: space.md }}>
          <Etapas total={dia.total_days} feitas={feitas} atual={dia.completed ? undefined : dia.number} />
          <View style={estilos.etapasLegenda}>
            <Text variant="micro" color={scheme.textMuted} numberOfLines={1} style={{ flex: 1 }}>
              {dia.trail_name}
            </Text>
            <Text variant="micro" font="bodySemi" color={scheme.accent}>
              {`${Math.round(((feitas + 1) / (dia.total_days + 1)) * 100)}%`}
            </Text>
          </View>
        </View>

        <Text variant="title" style={{ textAlign: 'center', marginTop: space.xl, color: scheme.accent }}>
          {dia.title}
        </Text>

        <View onLayout={rastreio.onLayoutTexto}>
          <ReflexaoReader
            reflexao={comoReflexao}
            entreTextoESecoes={
              duasVozes ? (
                <View style={{ marginTop: space.xl }}>
                  {dia.common_ground ? (
                    <View style={estilos.comum}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="git-compare-outline" size={14} color={scheme.gold} />
                        <Overline color={scheme.gold}>Em comum</Overline>
                      </View>
                      <Text variant="bodySm" color={scheme.textPrimary} style={{ marginTop: space.sm }}>
                        {dia.common_ground}
                      </Text>
                    </View>
                  ) : null}
                  {dia.protestant_view ? (
                    <Voz titulo="Voz protestante" fonte={dia.protestant_source} texto={dia.protestant_view} cor={COR_PROTESTANTE} />
                  ) : null}
                  {dia.catholic_view ? (
                    <Voz titulo="Voz católica" fonte={dia.catholic_source} texto={dia.catholic_view} cor={scheme.accent} />
                  ) : null}
                </View>
              ) : null
            }
          />
        </View>

        {dia.completed ? (
          <View style={estilos.fim}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color={scheme.gold} />
              <Text variant="bodySm" font="bodySemi">
                {resultado ? 'Etapa concluída' : 'Você já concluiu este dia'}
              </Text>
            </View>
            {dia.hook ? (
              <>
                <Overline color={scheme.gold} style={{ marginTop: space.lg }}>
                  Amanhã
                </Overline>
                <Text style={estilos.gancho}>{dia.hook}</Text>
              </>
            ) : null}
            <Button label="Voltar à trilha" variant="quiet" style={{ marginTop: space.lg }} onPress={() => router.back()} />
          </View>
        ) : null}
      </ScrollView>

      {dia.reflection_uuid ? (
        <View style={estilos.ancora} pointerEvents="box-none">
          <PlayerAudio
            reflectionUuid={dia.reflection_uuid}
            referencia={dia.scripture_reference}
            onAnotar={(prefixo) => {
              setPrefixoNota(prefixo);
              setAnotando(true);
            }}
            aoConcluir={concluir}
          />
        </View>
      ) : null}

      {dia.reflection_uuid ? (
        <NotaSheet
          visivel={anotando}
          reflectionUuid={dia.reflection_uuid}
          textoInicial={prefixoNota}
          onFechar={() => setAnotando(false)}
          onSalvou={() => setAnotando(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    etapasLegenda: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, gap: space.sm },
    ancora: {
      position: 'absolute',
      left: space.md,
      right: space.md,
      bottom: space.md,
      zIndex: 99,
      elevation: 10,
    },
    comum: {
      padding: space.lg,
      borderRadius: radius.md,
      backgroundColor: scheme.goldSubtle,
      borderWidth: 1,
      borderColor: scheme.goldSoft,
    },
    fim: {
      marginTop: space.section,
      padding: space.lg,
      borderRadius: radius.md,
      backgroundColor: scheme.canvasWarm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    gancho: {
      fontFamily: fonts.serifItalic,
      fontSize: 18,
      lineHeight: 25,
      color: scheme.textSecondary,
      marginTop: 4,
    },
  });
}
