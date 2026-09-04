/**
 * Player do audio da reflexao — exclusivo de apoiador.
 *
 * Deliberadamente NAO e o FAB arrastavel da web. As duas telas que o montam ja
 * rejeitam arrastar por escrito (hoje.tsx, leitura/[key].tsx): arrastar briga
 * com o gesto de voltar do iOS e com o scroll. Aqui e uma barra ancorada, no
 * mesmo desenho do botao ANOTAR.
 *
 * Fechado: pilula com a referencia. Aberto: transporte completo.
 *
 * Todo estado tem representacao visual — inclusive falha. A ausencia disso no
 * player da web e o que fez "o audio nao toca" virar um problema sem pista
 * nenhuma para quem usa.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text, scheme } from '../components/ui';
import { radius, shadow, space } from '../theme/tokens';
import { formatarTempo } from './tempo';
import { SALTO_SEGUNDOS, useAudioReflexao } from './useAudioReflexao';

interface Props {
  reflectionUuid: string;
  /** Referencia biblica — o rotulo da pilula fechada. */
  referencia?: string;
}

export function PlayerAudio({ reflectionUuid, referencia }: Props) {
  const [aberto, setAberto] = useState(false);
  const audio = useAudioReflexao(reflectionUuid);

  // Quem nao e apoiador nao ve nada: o paywall do audio e a propria ausencia,
  // e as telas ja tem outros lugares que convidam a apoiar.
  if (audio.semAcesso) return null;

  // Nem carregou nem falhou ainda: nao piscar uma pilula vazia na tela.
  if (!audio.transcript && !audio.erro && audio.carregando) return null;

  // Sem transcript e sem carregar: a reflexao nao tem audio (404). Idem.
  if (!audio.transcript && !audio.erro) return null;

  const progresso = audio.duracao > 0 ? audio.posicao / audio.duracao : 0;

  function tocar(acao: () => void) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    acao();
  }

  if (!aberto) {
    return (
      <Pressable
        onPress={() => tocar(() => setAberto(true))}
        accessibilityRole="button"
        accessibilityLabel="Ouvir a reflexão"
        style={({ pressed }) => [
          estilos.pilula,
          { backgroundColor: pressed ? scheme.accentPressed : scheme.accent },
        ]}
      >
        <Ionicons
          name={audio.tocando ? 'pause' : 'headset-outline'}
          size={16}
          color={scheme.onAccent}
        />
        <Text variant="micro" font="bodySemi" color={scheme.onAccent} style={estilos.rotulo}>
          {audio.erro ? 'ÁUDIO INDISPONÍVEL' : 'OUVIR'}
        </Text>
        {/* Fechado, o icone era identico com ou sem falha no player da web.
            Este ponto e a pista antes de abrir. */}
        {audio.erro ? <View style={estilos.pontoErro} /> : null}
      </Pressable>
    );
  }

  return (
    <View style={estilos.card}>
      <View style={estilos.cabecalho}>
        <View style={{ flex: 1, paddingRight: space.md }}>
          <Text variant="bodySm" font="serif" numberOfLines={1}>
            {audio.transcript?.title ?? referencia ?? 'Leitura do dia'}
          </Text>
          {audio.transcript?.subtitle ? (
            <Text variant="micro" color={scheme.textGhost} numberOfLines={1}>
              {audio.transcript.subtitle}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => setAberto(false)}
          accessibilityRole="button"
          accessibilityLabel="Fechar player"
          hitSlop={10}
        >
          <Ionicons name="chevron-down" size={20} color={scheme.textGhost} />
        </Pressable>
      </View>

      {audio.erro ? (
        <View style={estilos.erro}>
          <Text variant="micro" color={scheme.accent} style={{ flex: 1 }}>
            {audio.erro}
          </Text>
          <Pressable onPress={audio.tentarDeNovo} accessibilityRole="button" hitSlop={8}>
            <Text variant="micro" font="bodySemi" color={scheme.accent}>
              TENTAR DE NOVO
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Barra de progresso sem arrastar: o gesto horizontal aqui competiria
              com o swipe de voltar. Os saltos de 15s dao o controle fino. */}
          <View style={estilos.trilho}>
            <View style={[estilos.preenchimento, { width: `${Math.min(100, progresso * 100)}%` }]} />
          </View>

          <View style={estilos.tempos}>
            <Text variant="micro" color={scheme.textGhost}>
              {formatarTempo(audio.posicao)}
            </Text>
            <Text variant="micro" color={scheme.textGhost}>
              {formatarTempo(audio.duracao)}
            </Text>
          </View>

          <View style={estilos.transporte}>
            <Pressable
              onPress={audio.ciclarVelocidade}
              accessibilityRole="button"
              accessibilityLabel={`Velocidade ${audio.velocidade}x`}
              hitSlop={8}
              style={estilos.velocidade}
            >
              <Text variant="micro" font="bodySemi" color={scheme.textSecondary}>
                {audio.velocidade}x
              </Text>
            </Pressable>

            <View style={estilos.centro}>
              <Pressable
                onPress={() => tocar(() => audio.saltar(-SALTO_SEGUNDOS))}
                accessibilityRole="button"
                accessibilityLabel={`Voltar ${SALTO_SEGUNDOS} segundos`}
                hitSlop={8}
              >
                <Ionicons name="play-back" size={20} color={scheme.textSecondary} />
              </Pressable>

              <Pressable
                onPress={() => tocar(audio.alternar)}
                accessibilityRole="button"
                accessibilityLabel={audio.tocando ? 'Pausar' : 'Tocar'}
                style={({ pressed }) => [
                  estilos.botaoPrincipal,
                  { backgroundColor: pressed ? scheme.accentPressed : scheme.accent },
                ]}
              >
                {audio.bufferizando ? (
                  <ActivityIndicator size="small" color={scheme.onAccent} />
                ) : (
                  <Ionicons
                    name={audio.tocando ? 'pause' : 'play'}
                    size={20}
                    color={scheme.onAccent}
                    // O triangulo do play tem peso visual a esquerda; sem este
                    // empurrao ele parece descentralizado no circulo.
                    style={audio.tocando ? undefined : { marginLeft: 2 }}
                  />
                )}
              </Pressable>

              <Pressable
                onPress={() => tocar(() => audio.saltar(SALTO_SEGUNDOS))}
                accessibilityRole="button"
                accessibilityLabel={`Avançar ${SALTO_SEGUNDOS} segundos`}
                hitSlop={8}
              >
                <Ionicons name="play-forward" size={20} color={scheme.textSecondary} />
              </Pressable>
            </View>

            {/* Espelha a largura do botao de velocidade para o transporte ficar
                centrado de verdade. */}
            <View style={estilos.velocidade} />
          </View>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.sharp,
    ...shadow.raised,
  },
  rotulo: { letterSpacing: 2 },
  pontoErro: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: scheme.gold,
  },
  card: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: scheme.surface,
    borderWidth: 1,
    borderColor: scheme.borderSoft,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
    ...shadow.raised,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start' },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: scheme.accentSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  trilho: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: scheme.borderSoft,
    overflow: 'hidden',
  },
  preenchimento: { height: '100%', backgroundColor: scheme.gold },
  tempos: { flexDirection: 'row', justifyContent: 'space-between' },
  transporte: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  velocidade: { width: 40 },
  centro: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  botaoPrincipal: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
