/**
 * Player do audio da reflexao — exclusivo de apoiador.
 *
 * Deliberadamente NAO e o FAB arrastavel da web. As duas telas que o montam ja
 * rejeitam arrastar por escrito (hoje.tsx, leitura/[key].tsx): arrastar briga
 * com o gesto de voltar do iOS e com o scroll. Aqui e uma barra ancorada, no
 * mesmo desenho do botao ANOTAR.
 *
 * Fechado: pilula com a referencia (ou capsula unificada com Anotar).
 * Aberto: transporte completo.
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
  /** Callback opcional para acao de anotação (unifica Ouvir e Anotar em uma capsula). */
  onAnotar?: () => void;
}

export function PlayerAudio({ reflectionUuid, referencia, onAnotar }: Props) {
  const [aberto, setAberto] = useState(false);
  const audio = useAudioReflexao(reflectionUuid);

  function tocar(acao: () => void) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    acao();
  }

  const temAudio = !audio.semAcesso && (!!audio.transcript || !!audio.erro);

  // Se nao tem audio disponivel nem erro (ou sem acesso / carregando):
  if (!temAudio) {
    if (onAnotar) {
      return (
        <Pressable
          onPress={() => tocar(onAnotar)}
          accessibilityRole="button"
          accessibilityLabel="Escrever anotação"
          hitSlop={4}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={estilos.pilula}>
            <Ionicons name="create-outline" size={17} color={scheme.goldSoft} />
            <Text variant="micro" font="bodySemi" color="#FFFFFF" style={estilos.rotulo}>
              ANOTAR
            </Text>
          </View>
        </Pressable>
      );
    }
    return null;
  }

  const progresso = audio.duracao > 0 ? audio.posicao / audio.duracao : 0;

  if (!aberto) {
    if (onAnotar) {
      return (
        <View style={estilos.capsula}>
          <Pressable
            onPress={() => tocar(() => setAberto(true))}
            accessibilityRole="button"
            accessibilityLabel="Ouvir a reflexão"
            hitSlop={4}
            style={({ pressed }) => [
              estilos.secaoCapsula,
              pressed && estilos.secaoCapsulaPressed,
            ]}
          >
            <Ionicons
              name={audio.tocando ? 'pause' : 'headset-outline'}
              size={16}
              color={scheme.goldSoft}
            />
            <Text variant="micro" font="bodySemi" color="#FFFFFF" style={estilos.rotulo}>
              {audio.erro ? 'ÁUDIO' : 'OUVIR'}
            </Text>
            {audio.erro ? <View style={estilos.pontoErro} /> : null}
          </Pressable>

          <View style={estilos.divisorCapsula} />

          <Pressable
            onPress={() => tocar(onAnotar)}
            accessibilityRole="button"
            accessibilityLabel="Escrever anotação"
            hitSlop={4}
            style={({ pressed }) => [
              estilos.secaoCapsula,
              pressed && estilos.secaoCapsulaPressed,
            ]}
          >
            <Ionicons name="create-outline" size={16} color={scheme.goldSoft} />
            <Text variant="micro" font="bodySemi" color="#FFFFFF" style={estilos.rotulo}>
              ANOTAR
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => tocar(() => setAberto(true))}
        accessibilityRole="button"
        accessibilityLabel="Ouvir a reflexão"
        hitSlop={4}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={estilos.pilula}>
          <Ionicons
            name={audio.tocando ? 'pause' : 'headset-outline'}
            size={16}
            color={scheme.goldSoft}
          />
          <Text variant="micro" font="bodySemi" color="#FFFFFF" style={estilos.rotulo}>
            {audio.erro ? 'ÁUDIO INDISPONÍVEL' : 'OUVIR'}
          </Text>
          {audio.erro ? <View style={estilos.pontoErro} /> : null}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ alignItems: 'flex-end', gap: space.md }}>
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
            <Ionicons name="chevron-down" size={20} color={scheme.textSecondary} />
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
              {/* Botao de velocidade: toca ciclando pelas opcoes comuns. */}
              <Pressable
                onPress={() => tocar(audio.ciclarVelocidade)}
                accessibilityRole="button"
                accessibilityLabel={`Velocidade ${audio.velocidade} vezes. Toque para alterar.`}
                hitSlop={8}
                style={estilos.velocidade}
              >
                <Text variant="micro" font="bodySemi" color={scheme.textSecondary}>
                  {`${audio.velocidade}×`}
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
                    pressed && estilos.botaoPrincipalPressed,
                  ]}
                >
                  {audio.carregando ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons
                      name={audio.tocando ? 'pause' : 'play'}
                      size={22}
                      color="#FFFFFF"
                      style={!audio.tocando ? { marginLeft: 2 } : undefined}
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

      {onAnotar ? (
        <Pressable
          onPress={() => tocar(onAnotar)}
          accessibilityRole="button"
          accessibilityLabel="Escrever anotação"
          hitSlop={4}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={estilos.pilula}>
            <Ionicons name="create-outline" size={17} color={scheme.goldSoft} />
            <Text variant="micro" font="bodySemi" color="#FFFFFF" style={estilos.rotulo}>
              ANOTAR
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  capsula: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: radius.sharp,
    backgroundColor: scheme.accent,
    ...shadow.raised,
  },
  secaoCapsula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 16,
  },
  secaoCapsulaPressed: {
    backgroundColor: scheme.accentPressed,
    opacity: 0.9,
  },
  divisorCapsula: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.sharp,
    backgroundColor: scheme.accent,
    ...shadow.raised,
  },
  pilulaPressed: {
    backgroundColor: scheme.accentPressed,
    opacity: 0.9,
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
    backgroundColor: scheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  botaoPrincipalPressed: {
    backgroundColor: scheme.accentPressed,
    opacity: 0.9,
  },
});
