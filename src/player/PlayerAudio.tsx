import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../components/ui';
import { posthog } from '../config/posthog';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, type Scheme } from '../theme/tokens';
import { formatarTempo } from './tempo';
import { SALTO_SEGUNDOS, useAudioReflexao, type AudioReflexao } from './useAudioReflexao';

export const ALTURA_BARRA_AUDIO = 64;

interface Props {
  reflectionUuid: string;
  referencia?: string;
  onAnotar?: (prefixo?: string) => void;
  /** Chamado quando o audio toca ate o fim — ouvir conta como ler. */
  aoConcluir?: () => void;
}

function vibrar() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function duracaoLegivel(segundos: number): string | null {
  if (!Number.isFinite(segundos) || segundos <= 0) return null;
  const minutos = Math.max(1, Math.round(segundos / 60));
  return `${minutos} min`;
}

export function PlayerAudio({ reflectionUuid, referencia, onAnotar, aoConcluir }: Props) {
  const { scheme, effectiveMode } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const router = useRouter();
  const audio = useAudioReflexao(reflectionUuid, aoConcluir);
  const [aberto, setAberto] = useState(false);

  const origem = onAnotar ? 'hoje' : 'leitura';
  const titulo = audio.transcript?.title ?? referencia ?? 'Leitura do dia';
  const emAndamento = !!audio.transcript && (audio.tocando || audio.posicao > 0);
  const progresso = audio.duracao > 0 ? Math.min(1, audio.posicao / audio.duracao) : 0;

  function abrirAssinatura() {
    posthog?.capture('audio_paywall_opened', { reflection_uuid: reflectionUuid, source: origem });
    router.push({ pathname: '/assinatura', params: { origem: 'audio' } });
  }

  function abrirPlayer() {
    posthog?.capture('audio_player_expanded', { reflection_uuid: reflectionUuid, source: origem });
    setAberto(true);
  }

  function anotar() {
    vibrar();
    onAnotar?.();
  }

  const notaPendente = useRef<string | null>(null);

  function dispararNotaPendente() {
    const prefixo = notaPendente.current;
    if (prefixo === null) return;
    notaPendente.current = null;
    onAnotar?.(prefixo);
  }

  function anotarNoTrecho() {
    notaPendente.current = `[${formatarTempo(audio.posicao)}] `;
    setAberto(false);
    if (Platform.OS !== 'ios') setTimeout(dispararNotaPendente, 350);
  }

  const semAudio = !audio.semAcesso && !audio.transcript && !audio.carregando && !audio.erro;

  if (semAudio) {
    if (!onAnotar) return null;
    return (
      <View style={{ alignItems: 'flex-end' }}>
        <Vidro estilos={estilos} escuro={effectiveMode === 'dark'} compacto>
          <BotaoAnotar estilos={estilos} scheme={scheme} onPress={anotar} />
        </Vidro>
      </View>
    );
  }

  let acaoPrincipal: () => void;
  let iconePrincipal: keyof typeof Ionicons.glyphMap;
  let rotuloPrincipal: string;
  let linha1: ReactNode;
  let linha2: ReactNode;
  let acaoMeta: (() => void) | null;

  if (audio.semAcesso) {
    acaoPrincipal = abrirAssinatura;
    iconePrincipal = 'headset';
    rotuloPrincipal = 'Ouvir a reflexão, exclusivo do Plano Apoiador';
    acaoMeta = abrirAssinatura;
    linha1 = 'Ouvir a reflexão';
    linha2 = (
      <>
        <Text variant="caption" font="bodyMedium" color={scheme.textMuted}>
          Versão narrada ·{' '}
        </Text>
        <Ionicons name="lock-closed" size={11} color={scheme.gold} />
        <Text variant="caption" font="bodySemi" color={scheme.gold}>
          {' '}Apoiador
        </Text>
      </>
    );
  } else if (audio.erro) {
    acaoPrincipal = audio.tentarDeNovo;
    iconePrincipal = 'refresh';
    rotuloPrincipal = 'Tentar carregar o áudio de novo';
    acaoMeta = audio.tentarDeNovo;
    linha1 = 'Áudio indisponível';
    linha2 = (
      <Text variant="caption" font="bodyMedium" color={scheme.accent}>
        Toque para tentar de novo
      </Text>
    );
  } else if (emAndamento) {
    acaoPrincipal = audio.alternar;
    iconePrincipal = audio.tocando ? 'pause' : 'play';
    rotuloPrincipal = audio.tocando ? 'Pausar' : 'Continuar ouvindo';
    acaoMeta = abrirPlayer;
    linha1 = titulo;
    linha2 = (
      <Text variant="caption" font="bodyMedium" color={scheme.textMuted} style={estilos.numeros}>
        {`${formatarTempo(audio.posicao)} de ${formatarTempo(audio.duracao)} · ${audio.velocidade}×`}
      </Text>
    );
  } else {
    acaoPrincipal = audio.alternar;
    iconePrincipal = 'play';
    rotuloPrincipal = 'Ouvir a reflexão';
    acaoMeta = audio.transcript ? abrirPlayer : null;
    linha1 = 'Ouvir a reflexão';
    const duracao = duracaoLegivel(audio.duracao);
    linha2 = (
      <Text variant="caption" font="bodyMedium" color={scheme.textMuted}>
        {audio.carregando ? 'Carregando…' : duracao ? `${duracao} · versão narrada` : 'Versão narrada'}
      </Text>
    );
  }

  const carregandoPlay = audio.carregando && !audio.transcript && !audio.semAcesso;

  return (
    <>
      <Vidro estilos={estilos} escuro={effectiveMode === 'dark'}>
        <Pressable
          onPress={() => {
            vibrar();
            acaoPrincipal();
          }}
          disabled={carregandoPlay}
          accessibilityRole="button"
          accessibilityLabel={rotuloPrincipal}
          hitSlop={6}
          style={({ pressed }) => [estilos.play, pressed && estilos.playPressed]}
        >
          {carregandoPlay || (audio.bufferizando && audio.tocando) ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons
              name={iconePrincipal}
              size={iconePrincipal === 'headset' ? 21 : 22}
              color="#FFFFFF"
              style={iconePrincipal === 'play' ? { marginLeft: 3 } : undefined}
            />
          )}
          {audio.semAcesso ? (
            <View style={estilos.cadeado}>
              <Ionicons name="lock-closed" size={10} color={scheme.gold} />
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={acaoMeta ?? undefined}
          disabled={!acaoMeta}
          accessibilityRole="button"
          accessibilityLabel={emAndamento ? `Abrir player: ${titulo}` : undefined}
          style={estilos.meta}
        >
          <Text
            variant="bodySm"
            font={emAndamento ? 'serifSemi' : 'bodySemi'}
            numberOfLines={1}
            style={emAndamento ? estilos.tituloSerif : undefined}
          >
            {linha1}
          </Text>
          <View style={estilos.linha2}>{linha2}</View>
        </Pressable>

        {emAndamento ? (
          <Pressable
            onPress={() => {
              vibrar();
              audio.saltar(SALTO_SEGUNDOS);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Avançar ${SALTO_SEGUNDOS} segundos`}
            hitSlop={4}
            style={estilos.fantasma}
          >
            <Ionicons name="play-forward" size={20} color={scheme.textSecondary} />
          </Pressable>
        ) : null}

        {onAnotar ? (
          <BotaoAnotar estilos={estilos} scheme={scheme} onPress={anotar} redondo={emAndamento} />
        ) : null}

        {emAndamento ? (
          <View style={estilos.progressoBarra} pointerEvents="none">
            <View style={[estilos.progressoBarraCheio, { width: `${progresso * 100}%` }]} />
          </View>
        ) : null}
      </Vidro>

      <FolhaPlayer
        visivel={aberto}
        audio={audio}
        titulo={titulo}
        referencia={referencia}
        onFechar={() => setAberto(false)}
        onFechou={dispararNotaPendente}
        onAnotarNoTrecho={onAnotar ? anotarNoTrecho : undefined}
      />
    </>
  );
}

function Vidro({
  estilos,
  escuro,
  compacto,
  children,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  escuro: boolean;
  compacto?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={estilos.sombra}>
      <View style={[estilos.barra, compacto && estilos.barraCompacta]}>
        {Platform.OS === 'ios' ? (
          <BlurView tint={escuro ? 'dark' : 'light'} intensity={70} style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, estilos.veu]} />
          </BlurView>
        ) : null}
        {children}
      </View>
    </View>
  );
}

function BotaoAnotar({
  estilos,
  scheme,
  onPress,
  redondo,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  scheme: Scheme;
  onPress: () => void;
  redondo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Escrever anotação"
      hitSlop={4}
      style={({ pressed }) => [
        estilos.anotar,
        redondo && estilos.anotarRedondo,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons name="pencil-outline" size={redondo ? 19 : 17} color={scheme.gold} />
      {redondo ? null : (
        <Text variant="bodySm" font="bodySemi" color={scheme.gold}>
          Anotar
        </Text>
      )}
    </Pressable>
  );
}

function FolhaPlayer({
  visivel,
  audio,
  titulo,
  referencia,
  onFechar,
  onFechou,
  onAnotarNoTrecho,
}: {
  visivel: boolean;
  audio: AudioReflexao;
  titulo: string;
  referencia?: string;
  onFechar: () => void;
  onFechou: () => void;
  onAnotarNoTrecho?: () => void;
}) {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const insets = useSafeAreaInsets();
  const restante = Math.max(0, audio.duracao - audio.posicao);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  const arrasto = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.8) fechar.current();
      },
    }),
  ).current;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={onFechar}
      onDismiss={onFechou}
    >
      <Pressable style={estilos.scrim} onPress={onFechar} accessibilityLabel="Fechar player" />
      <View style={[estilos.folha, { paddingBottom: Math.max(space.xl, insets.bottom + space.md) }]}>
        <View {...arrasto.panHandlers} style={estilos.folhaTopo}>
          <View style={estilos.alca} />
          <Text variant="overline" font="bodySemi" color={scheme.gold} style={estilos.sobretitulo}>
            REFLEXÃO NARRADA
          </Text>
          <Text variant="title" style={{ textAlign: 'center', marginTop: space.sm }} numberOfLines={2}>
            {titulo}
          </Text>
          {audio.transcript?.subtitle || referencia ? (
            <Text
              variant="caption"
              color={scheme.textMuted}
              style={{ textAlign: 'center', marginTop: space.xs }}
              numberOfLines={1}
            >
              {audio.transcript?.subtitle || referencia}
            </Text>
          ) : null}
        </View>

        <Scrubber
          posicao={audio.posicao}
          duracao={audio.duracao}
          onSoltar={audio.irPara}
          estilos={estilos}
        />
        <View style={estilos.tempos}>
          <Text variant="micro" color={scheme.textMuted} style={estilos.numeros}>
            {formatarTempo(audio.posicao)}
          </Text>
          <Text variant="micro" color={scheme.textMuted} style={estilos.numeros}>
            {`−${formatarTempo(restante)}`}
          </Text>
        </View>

        <View style={estilos.transporte}>
          <Pressable
            onPress={() => {
              vibrar();
              audio.ciclarVelocidade();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Velocidade ${audio.velocidade} vezes. Toque para alterar.`}
            hitSlop={8}
            style={estilos.chip}
          >
            <Text variant="caption" font="bodySemi" color={scheme.textSecondary} style={estilos.numeros}>
              {`${audio.velocidade}×`}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              vibrar();
              audio.saltar(-SALTO_SEGUNDOS);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Voltar ${SALTO_SEGUNDOS} segundos`}
            hitSlop={8}
            style={estilos.salto}
          >
            <Ionicons name="play-back" size={28} color={scheme.textPrimary} />
            <Text variant="micro" font="bodySemi" color={scheme.textMuted}>
              {SALTO_SEGUNDOS}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              vibrar();
              audio.alternar();
            }}
            accessibilityRole="button"
            accessibilityLabel={audio.tocando ? 'Pausar' : 'Tocar'}
            style={({ pressed }) => [estilos.playGrande, pressed && estilos.playPressed]}
          >
            {audio.bufferizando && audio.tocando ? (
              <ActivityIndicator color={scheme.textPrimary} />
            ) : (
              <Ionicons
                name={audio.tocando ? 'pause' : 'play'}
                size={32}
                color={scheme.textPrimary}
                style={!audio.tocando ? { marginLeft: 4 } : undefined}
              />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              vibrar();
              audio.saltar(SALTO_SEGUNDOS);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Avançar ${SALTO_SEGUNDOS} segundos`}
            hitSlop={8}
            style={estilos.salto}
          >
            <Ionicons name="play-forward" size={28} color={scheme.textPrimary} />
            <Text variant="micro" font="bodySemi" color={scheme.textMuted}>
              {SALTO_SEGUNDOS}
            </Text>
          </Pressable>

          <Pressable
            onPress={onFechar}
            accessibilityRole="button"
            accessibilityLabel="Minimizar player"
            hitSlop={8}
            style={estilos.chip}
          >
            <Ionicons name="chevron-down" size={18} color={scheme.textSecondary} />
          </Pressable>
        </View>

        {onAnotarNoTrecho ? (
          <Pressable
            onPress={() => {
              vibrar();
              onAnotarNoTrecho();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Anotar neste trecho, em ${formatarTempo(audio.posicao)}`}
            style={({ pressed }) => [estilos.anotarTrecho, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="pencil-outline" size={18} color={scheme.gold} />
            <Text variant="bodySm" font="bodySemi" color={scheme.gold}>
              Anotar neste trecho
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

function Scrubber({
  posicao,
  duracao,
  onSoltar,
  estilos,
}: {
  posicao: number;
  duracao: number;
  onSoltar: (segundos: number) => void;
  estilos: ReturnType<typeof criarEstilos>;
}) {
  const [largura, setLargura] = useState(0);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const estado = useRef({ largura: 0, duracao: 0, inicio: 0, soltar: onSoltar });
  estado.current.largura = largura;
  estado.current.duracao = duracao;
  estado.current.soltar = onSoltar;

  const gesto = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        estado.current.inicio = e.nativeEvent.locationX;
        setArrastando(razaoEm(estado.current.largura, e.nativeEvent.locationX));
      },
      onPanResponderMove: (_, g) =>
        setArrastando(razaoEm(estado.current.largura, estado.current.inicio + g.dx)),
      onPanResponderRelease: (_, g) => {
        const r = razaoEm(estado.current.largura, estado.current.inicio + g.dx);
        setArrastando(null);
        if (estado.current.duracao > 0) estado.current.soltar(r * estado.current.duracao);
      },
      onPanResponderTerminate: () => setArrastando(null),
    }),
  ).current;

  const razao = arrastando ?? (duracao > 0 ? Math.min(1, posicao / duracao) : 0);

  return (
    <View
      {...gesto.panHandlers}
      onLayout={(e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel="Posição do áudio"
      accessibilityValue={{ text: `${formatarTempo(razao * duracao)} de ${formatarTempo(duracao)}` }}
      style={estilos.scrubber}
    >
      <View style={estilos.trilho} pointerEvents="none">
        <View style={[estilos.trilhoCheio, { width: `${razao * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          estilos.polegar,
          arrastando !== null && estilos.polegarAtivo,
          { left: razao * largura - (arrastando !== null ? 11 : 8) },
        ]}
      />
    </View>
  );
}

function razaoEm(largura: number, x: number): number {
  return largura > 0 ? Math.min(1, Math.max(0, x / largura)) : 0;
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    sombra: {
      borderRadius: radius.pill,
      backgroundColor: Platform.OS === 'ios' ? 'transparent' : scheme.surface,
      shadowColor: '#3A2F1E',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    barra: {
      height: ALTURA_BARRA_AUDIO,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: 8,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    barraCompacta: { gap: 0 },
    veu: { backgroundColor: scheme.surfaceGlass },
    play: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: scheme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playPressed: { backgroundColor: scheme.accentPressed, transform: [{ scale: 0.96 }] },
    cadeado: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: scheme.goldSubtle,
      borderWidth: 1.5,
      borderColor: scheme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meta: { flex: 1, minWidth: 0, justifyContent: 'center', height: ALTURA_BARRA_AUDIO },
    tituloSerif: { fontSize: 18, lineHeight: 22 },
    linha2: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
    numeros: { fontVariant: ['tabular-nums'] },
    fantasma: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    anotar: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingLeft: 14,
      paddingRight: 16,
      borderRadius: 24,
      backgroundColor: scheme.goldSubtle,
      borderWidth: 1,
      borderColor: scheme.goldSoft,
    },
    anotarRedondo: { width: 48, paddingLeft: 0, paddingRight: 0, justifyContent: 'center' },
    progressoBarra: {
      position: 'absolute',
      left: 32,
      right: 32,
      bottom: 0,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: scheme.goldSubtle,
    },
    progressoBarraCheio: { height: 2.5, borderRadius: 2, backgroundColor: scheme.gold },
    scrim: { flex: 1, backgroundColor: 'rgba(20,14,10,0.36)' },
    folha: {
      backgroundColor: scheme.canvas,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: space.xl,
      paddingTop: space.sm,
      shadowColor: '#140E0A',
      shadowOpacity: 0.18,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: -8 },
      elevation: 16,
    },
    folhaTopo: { alignItems: 'center', paddingBottom: space.sm },
    alca: { width: 38, height: 5, borderRadius: 3, backgroundColor: scheme.border, marginBottom: space.lg },
    sobretitulo: { letterSpacing: 3 },
    scrubber: { height: 32, justifyContent: 'center', marginTop: space.lg },
    trilho: { height: 6, borderRadius: 3, backgroundColor: scheme.goldSubtle, overflow: 'hidden' },
    trilhoCheio: { height: 6, backgroundColor: scheme.gold },
    polegar: {
      position: 'absolute',
      top: 8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.goldSoft,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    polegarAtivo: { top: 5, width: 22, height: 22, borderRadius: 11 },
    tempos: { flexDirection: 'row', justifyContent: 'space-between' },
    transporte: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.lg,
    },
    chip: {
      width: 52,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: scheme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    salto: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    playGrande: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: scheme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: scheme.accent,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    anotarTrecho: {
      marginTop: space.xl,
      height: 52,
      borderRadius: 26,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.sm,
      backgroundColor: scheme.goldSubtle,
      borderWidth: 1,
      borderColor: scheme.goldSoft,
    },
  });
}
