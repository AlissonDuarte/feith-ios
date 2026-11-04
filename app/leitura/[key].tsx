import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ScrollView,
  Share,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { formatRelativePT, formatLongPT } from '../../src/api/dates';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection, ReflectionNote } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { NotaSheet } from '../../src/components/NotaSheet';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import {
  Button,
  Card,
  EmptyState,
  GoldRule,
  IconButton,
  Loading,
  Overline,
  Text,
} from '../../src/components/ui';
import { posthog } from '../../src/config/posthog';
import { useRastreioDeLeitura } from '../../src/config/useRastreioDeLeitura';
import { lembreteAssinaturaDevido } from '../../src/iap/lembretesAssinatura';
import { minutosDeLeitura, secaoAtual } from '../../src/leitura/regras';
import { PRIMEIRO_DIA_KEY } from '../../src/leitura/primeiroDia';
import { useRastreioDaIdeia } from '../../src/leitura/useRastreioDaIdeia';
import { ALTURA_BARRA_AUDIO, PlayerAudio } from '../../src/player/PlayerAudio';
import { trechoDe } from '../../src/share/trecho';
import { useTheme } from '../../src/theme/ThemeContext';
import { REFLECTION_SECTIONS, fonts, space, type Scheme } from '../../src/theme/tokens';
import { reloadWidgets } from '../../src/widgets/reloadWidgets';

const ESCALAS = [1, 1.15, 1.3];
const ESCALA_KEY = 'feith.leitura.escala';

type Modo = 'curta' | 'etapas';

export default function Leitura() {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const params = useLocalSearchParams<{
    key: string;
    modo?: string;
    etapa?: string;
    ouvir?: string;
    primeira?: string;
    hoje?: string;
  }>();
  const { key } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focado = useIsFocused();
  const { refreshSummary, isSupporter, isGuest } = useAuth();
  const ehHoje = params.hoje === '1';

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [notas, setNotas] = useState<ReflectionNote[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [escrevendo, setEscrevendo] = useState(false);
  const [prefixoNota, setPrefixoNota] = useState<string | undefined>(undefined);
  const [modoEscolhido, setModoEscolhido] = useState<Modo>(params.modo === 'curta' ? 'curta' : 'etapas');
  const [escala, setEscala] = useState(1);
  const [secoesY, setSecoesY] = useState<Record<string, number>>({});
  const [inicioSecoes, setInicioSecoes] = useState(0);
  const [atual, setAtual] = useState(-1);
  const [concluindo, setConcluindo] = useState(false);
  const [abrirPlayer, setAbrirPlayer] = useState(params.ouvir === '1');

  const modo: Modo = modoEscolhido === 'curta' && reflexao?.core_idea?.trim() ? 'curta' : 'etapas';
  const scrollRef = useRef<ScrollView>(null);
  const registrouLeitura = useRef(false);
  const abriuEtapa = useRef(false);
  const contexto = useRef({ focado, escrevendo, isSupporter });
  contexto.current = { focado, escrevendo, isSupporter };
  const timerLembrete = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoLer = useCallback(() => {
    if (!ehHoje || contexto.current.isSupporter) return;
    void lembreteAssinaturaDevido().then((marco) => {
      if (!marco) return;
      if (timerLembrete.current) clearTimeout(timerLembrete.current);
      timerLembrete.current = setTimeout(() => {
        const c = contexto.current;
        if (c.isSupporter || !c.focado || c.escrevendo || AppState.currentState !== 'active') return;
        router.push({ pathname: '/assinatura', params: { origem: 'lembrete', marco } });
      }, 2500);
    });
  }, [ehHoje, router]);

  const rastreio = useRastreioDeLeitura(modo === 'etapas' ? reflexao : null, ehHoje ? 'hoje' : 'leitura', aoLer);
  const marcarDesfecho = useRastreioDaIdeia(modo === 'curta' && reflexao ? reflexao.uuid : null);
  const secoesAlcancadas = useRef(new Set<string>());

  useEffect(
    () => () => {
      if (timerLembrete.current) clearTimeout(timerLembrete.current);
    },
    [],
  );

  useEffect(() => {
    AsyncStorage.getItem(ESCALA_KEY)
      .then((salva) => {
        const valor = Number(salva);
        if (ESCALAS.includes(valor)) setEscala(valor);
      })
      .catch(() => undefined);
  }, []);

  function trocarEscala() {
    const proxima = ESCALAS[(ESCALAS.indexOf(escala) + 1) % ESCALAS.length];
    setEscala(proxima);
    void AsyncStorage.setItem(ESCALA_KEY, String(proxima));
    posthog?.capture('reader_font_changed', { escala: proxima });
  }

  const registrarLeitura = useCallback(async (motivo: 'concluiu_curta' | 'abriu_etapas' | 'tocou_audio') => {
    if (registrouLeitura.current) return;
    registrouLeitura.current = true;
    try {
      await api.markReflectionRead(motivo);
      await refreshSummary();
      void reloadWidgets();
    } catch {
      registrouLeitura.current = false;
    }
  }, [refreshSummary]);

  const carregarNotas = useCallback(async () => {
    if (!key) return;
    try {
      const page = await api.getReflectionNotes(key, { page: 1, page_size: 50 });
      setNotas(page.items);
    } catch {
      setNotas([]);
    }
  }, [key]);

  const carregar = useCallback(async () => {
    if (!key) return;
    setErro(null);
    try {
      setReflexao(await api.getReflection(key));
      await carregarNotas();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [key, carregarNotas]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  useEffect(() => {
    if (!reflexao) return;
    if (modo === 'curta') {
      posthog?.capture('reflection_opened', { reflection_uuid: reflexao.uuid, source: 'curta' });
      return;
    }
    if (abriuEtapa.current) return;
    abriuEtapa.current = true;
    void registrarLeitura('abriu_etapas');
  }, [reflexao?.uuid, modo, registrarLeitura]);

  const secoes = useMemo(
    () => (reflexao ? REFLECTION_SECTIONS.filter((s) => reflexao[s.key]) : []),
    [reflexao],
  );

  useEffect(() => {
    const alvo = params.etapa ? secoesY[params.etapa] : undefined;
    if (alvo === undefined || modo !== 'etapas') return;
    scrollRef.current?.scrollTo({ y: inicioSecoes + alvo - space.lg, animated: false });
  }, [params.etapa, secoesY, inicioSecoes, modo]);

  const posicoes = secoes.map((s) => inicioSecoes + (secoesY[s.key] ?? Number.MAX_SAFE_INTEGER));
  const posicoesRef = useRef(posicoes);
  posicoesRef.current = posicoes;
  const minutosRestantes = reflexao
    ? minutosDeLeitura(secoes.slice(Math.max(atual, 0)).map((s) => reflexao[s.key]))
    : 0;
  const minutosTotais = reflexao
    ? minutosDeLeitura([reflexao.bible_text, ...secoes.map((s) => reflexao[s.key])])
    : 0;

  function aoRolar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    rastreio.onScroll(e);
    const proxima = secaoAtual(posicoesRef.current, e.nativeEvent.contentOffset.y);
    setAtual((anterior) => (anterior === proxima ? anterior : proxima));
    const secao = secoes[proxima];
    if (secao && !secoesAlcancadas.current.has(secao.key)) {
      secoesAlcancadas.current.add(secao.key);
      posthog?.capture('reflection_section_reached', {
        reflection_uuid: reflexao?.uuid ?? null,
        section: secao.key,
        position: proxima + 1,
        total: secoes.length,
        source: ehHoje ? 'hoje' : 'leitura',
      });
    }
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/hoje');
  }

  async function concluirPorHoje() {
    if (!reflexao) return;
    setConcluindo(true);
    posthog?.capture('reading_finished_for_today', { reflection_uuid: reflexao.uuid, modo });
    marcarDesfecho('concluded');
    await registrarLeitura('concluiu_curta');
    const visto = await AsyncStorage.getItem(PRIMEIRO_DIA_KEY).catch(() => null);
    if (!visto && (params.primeira === '1' || isGuest)) {
      setConcluindo(false);
      router.replace('/primeiro-dia');
      return;
    }
    const marco = ehHoje && !isSupporter ? await lembreteAssinaturaDevido().catch(() => null) : null;
    setConcluindo(false);
    voltar();
    if (marco) router.push({ pathname: '/assinatura', params: { origem: 'lembrete', marco } });
  }

  function aprofundar() {
    posthog?.capture('reflection_depth_opened', { reflection_uuid: reflexao?.uuid ?? null });
    marcarDesfecho('deepened');
    setAbrirPlayer(false);
    setModoEscolhido('etapas');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function compartilhar() {
    if (!reflexao) return;
    try {
      const link = await api.createShareLink(reflexao.uuid);
      const corte = trechoDe(reflexao.bible_text);
      const trecho = corte ? `"${corte}"\n\n` : '';
      await Share.share(
        {
          title: `${reflexao.scripture_reference} — feith`,
          message: `📖 ${reflexao.scripture_reference}\n\n${trecho}Leia a reflexão e exegese completa no feith:\n${link.url}`,
          url: link.url,
        },
        { subject: `${reflexao.scripture_reference} — feith` },
      );
      posthog?.capture('reflection_shared', { source: 'reflection_reader' });
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (erro || !reflexao) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível abrir"
          descricao={erro ?? undefined}
          acao={<Button label="Tentar de novo" onPress={() => void carregar()} />}
        />
      </SafeAreaView>
    );
  }

  const textoApoio = reflexao.core_idea?.trim() || reflexao.bible_text;

  return (
    <View style={estilos.tela}>
      <Stack.Screen
        options={{
          title: modo === 'etapas' ? reflexao.scripture_reference : '',
          headerLeft: router.canGoBack()
            ? undefined
            : () => <IconButton name="close" label="Fechar" onPress={voltar} size={20} />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <IconButton name="text-outline" label="Mudar o tamanho da letra" onPress={trocarEscala} size={18} />
              <BotaoFavorito
                reflectionUuid={reflexao.uuid}
                favoritado={reflexao.bookmarked}
                onMudou={(v) => setReflexao((r) => (r ? { ...r, bookmarked: v } : r))}
                tamanho={19}
              />
              {modo === 'etapas' ? (
                <>
                  <IconButton
                    name="image-outline"
                    label="Cartão para compartilhar"
                    onPress={() => router.push(`/leitura/compartilhar-cartao?key=${reflexao.uuid}`)}
                    size={18}
                  />
                  <IconButton name="share-outline" label="Compartilhar" onPress={compartilhar} size={18} />
                </>
              ) : null}
            </View>
          ),
        }}
      />

      {modo === 'curta' ? (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: space.gutter,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.sm,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="hero" accessibilityRole="header">
            {reflexao.scripture_reference}
          </Text>
          <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 2 }}>
            {[reflexao.version, formatLongPT(reflexao.publishAt)].filter(Boolean).join(' · ')}
          </Text>

          <View style={estilos.versiculo}>
            <Text
              style={{
                fontFamily: fonts.serif,
                fontSize: 24 * escala,
                lineHeight: 33 * escala,
                color: scheme.textPrimary,
              }}
            >
              {reflexao.bible_text}
            </Text>
          </View>

          <View style={estilos.rotulo}>
            <Overline>A ideia central</Overline>
            <Text variant="caption" color={scheme.textMuted}>
              1 min
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 17 * escala, lineHeight: 27 * escala, marginTop: 6, color: scheme.textPrimary }}>
            {reflexao.core_idea}
          </Text>

          <View style={{ marginTop: 'auto', paddingTop: space.xl, gap: space.md }}>
            <Text variant="caption" color={scheme.textMuted} style={{ textAlign: 'center' }}>
              Contexto · Exegese · Doutrina · Aplicação · Oração
            </Text>
            <PlayerAudio
              reflectionUuid={reflexao.uuid}
              referencia={reflexao.scripture_reference}
              origem="curta"
              aoTocar={() => void registrarLeitura('tocou_audio')}
              abrirAoCarregar={abrirPlayer}
              textoApoio={textoApoio}
              aoConcluir={aoLer}
            />
            <Button label={`Aprofundar em 5 etapas · ${minutosTotais} min`} icon="arrow-forward" onPress={aprofundar} />
            <Button
              label="Concluir por hoje"
              variant="ghost"
              textColor={scheme.accent}
              loading={concluindo}
              onPress={() => void concluirPorHoje()}
              style={{ alignSelf: 'center' }}
            />
          </View>
        </ScrollView>
      ) : (
        <>
          {secoes.length > 0 ? (
            <View style={estilos.progresso}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {secoes.map((s, i) => (
                  <View
                    key={s.key}
                    style={[
                      estilos.segmento,
                      i < atual && { backgroundColor: scheme.goldSoft },
                      i === atual && { backgroundColor: scheme.accent },
                    ]}
                  />
                ))}
              </View>
              <Text variant="micro" color={scheme.textMuted} style={{ marginTop: 6 }}>
                {atual < 0
                  ? `Texto bíblico · ${minutosTotais} min no total`
                  : `Etapa ${atual + 1} de ${secoes.length} · ${minutosRestantes === 1 ? 'falta cerca de 1 min' : `faltam ${minutosRestantes} min`}`}
              </Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: space.gutter,
              paddingBottom: Math.max(insets.bottom, space.lg) + ALTURA_BARRA_AUDIO + space.xxl,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={aoRolar}
            scrollEventThrottle={rastreio.scrollEventThrottle}
          >
            <View
              onLayout={(e) => {
                rastreio.onLayoutTexto(e);
                setInicioSecoes(e.nativeEvent.layout.y);
              }}
            >
              <ReflexaoReader
                reflexao={reflexao}
                escala={escala}
                aoMedirSecao={(chave, y) => setSecoesY((atuais) => (atuais[chave] === y ? atuais : { ...atuais, [chave]: y }))}
              />
            </View>

            {notas.length > 0 ? (
              <View style={{ marginTop: space.sm }}>
                <Overline>Suas anotações</Overline>
                <GoldRule align="left" width={40} style={{ marginTop: space.md }} />
                {notas.map((n) => (
                  <Card key={n.note_uuid} style={{ marginTop: space.lg }}>
                    <Text variant="body">{n.note}</Text>
                    <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.md }}>
                      {formatRelativePT(n.createdAt)}
                    </Text>
                  </Card>
                ))}
              </View>
            ) : null}

            {ehHoje ? (
              <Button
                label="Concluir por hoje"
                variant="secondary"
                loading={concluindo}
                onPress={() => void concluirPorHoje()}
                style={{ marginTop: space.xl }}
              />
            ) : null}
          </ScrollView>

          <View style={[estilos.ancora, { bottom: Math.max(insets.bottom, space.lg) }]} pointerEvents="box-none">
            <PlayerAudio
              reflectionUuid={reflexao.uuid}
              referencia={reflexao.scripture_reference}
              onAnotar={(prefixo) => {
                setPrefixoNota(prefixo);
                setEscrevendo(true);
              }}
              origem="etapas"
              aoTocar={() => void registrarLeitura('tocou_audio')}
              abrirAoCarregar={abrirPlayer}
              textoApoio={textoApoio}
              aoConcluir={aoLer}
            />
          </View>
        </>
      )}

      <NotaSheet
        visivel={escrevendo}
        textoInicial={prefixoNota}
        reflectionUuid={reflexao.uuid}
        onFechar={() => setEscrevendo(false)}
        onSalvou={() => {
          setEscrevendo(false);
          void carregarNotas();
        }}
      />
    </View>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    tela: { flex: 1, backgroundColor: scheme.canvas },
    versiculo: {
      marginTop: space.lg,
      paddingVertical: 18,
      paddingHorizontal: 20,
      backgroundColor: scheme.canvasWarm,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: scheme.goldSoft,
    },
    rotulo: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: space.xl,
    },
    progresso: { paddingHorizontal: space.gutter, paddingBottom: space.sm },
    segmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: scheme.border },
    ancora: {
      position: 'absolute',
      left: space.md,
      right: space.md,
      zIndex: 99,
      elevation: 10,
    },
  });
}
