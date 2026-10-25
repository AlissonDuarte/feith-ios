import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { posthog } from '../config/posthog';
import { Button, Card, GoldRule, Overline, Text } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadow, space, type Scheme } from '../theme/tokens';
import { useTourTargetsRegistry } from './TourTargets';
import { useFeatureOnboarding } from './useFeatureOnboarding';

const PADDING_RECORTE = 10;
/** Quanto tempo esperar um alvo aparecer (navegacao + montagem da tela) antes de pular o passo. */
const TIMEOUT_ALVO_MS = 2500;

interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Walkthrough guiado de feature, dirigido pelo servidor (ver
 * onboarding_service.py) — MESMA mecanica de spotlight do CoachTour
 * (src/components/CoachTour.tsx: mascara SVG, aro de destaque, balao de
 * texto), so que o alvo de cada passo vem de `target_key` (resolvido no
 * registro global, TourTargets.tsx) em vez de um ref fixo passado por props.
 *
 * Passo sem `target_key`: nao ha nada dentro do app pra apontar (ex.: "toque
 * e segure na tela inicial do aparelho" — fora da arvore de UI do app, nenhum
 * walkthrough alcanca isso). Renderiza so o balao, sem mascara nem aro —
 * mesmo fallback que o CoachTour ja usa quando um alvo nao cabe na tela.
 */
export function FeatureWalkthrough() {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const { width: larguraTela, height: alturaTela } = Dimensions.get('window');
  const router = useRouter();
  const pathname = usePathname();
  const registro = useTourTargetsRegistry();

  const { item, resolvendo, completar, dispensar } = useFeatureOnboarding();
  const [indice, setIndice] = useState(0);
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);

  const passo = item?.steps[indice];
  const ultimo = !!item && indice === item.steps.length - 1;

  useEffect(() => {
    setIndice(0);
    setRetangulo(null);
  }, [item?.key]);

  // Navega pra tela certa antes de medir, quando o passo exige uma diferente
  // da atual. Sem isso, um alvo de outra aba nunca vai ser encontrado.
  useEffect(() => {
    if (!passo?.screen || pathname === passo.screen) return;
    router.push(passo.screen as never);
  }, [passo?.screen, pathname, router]);

  useEffect(() => {
    if (!passo) return;

    if (!passo.target_key) {
      setRetangulo(null);
      return;
    }

    if (passo.screen && pathname !== passo.screen) return;

    let cancelado = false;
    let frame: number;
    const comeco = Date.now();

    const medir = () => {
      if (cancelado) return;
      const alvo = registro.get(passo.target_key!);
      alvo?.ref.current?.measureInWindow((x, y, w, h) => {
        if (cancelado) return;
        if (w > 0 && h > 0) {
          setRetangulo({ x, y, width: w, height: h });
          return;
        }
        tentarDeNovo();
      });
      if (!alvo?.ref.current) tentarDeNovo();
    };

    const tentarDeNovo = () => {
      if (cancelado) return;
      if (Date.now() - comeco > TIMEOUT_ALVO_MS) {
        // Alvo nunca apareceu (chave errada, tela nao montou a tempo). Pula
        // o passo em vez de travar o usuario num walkthrough que nao avanca.
        posthog?.capture('feature_walkthrough_target_missing', {
          key: item?.key ?? null,
          target_key: passo.target_key ?? null,
        });
        cancelado = true;
        avancarOuConcluir();
        return;
      }
      frame = requestAnimationFrame(medir);
    };

    setRetangulo(null);
    frame = requestAnimationFrame(medir);
    return () => {
      cancelado = true;
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, pathname, registro]);

  if (!item || !passo) return null;

  function avancarOuConcluir() {
    if (!passo) return;
    if (ultimo) {
      // Produz o mesmo efeito de tocar no elemento de verdade (ex.: abrir a
      // tela que o botao abriria), em vez de so fechar o walkthrough. Se o
      // alvo nunca foi encontrado (pulo por timeout), nao ha acao pra
      // disparar — o optional chaining cobre isso sem precisar de outro ramo.
      if (passo.target_key) registro.get(passo.target_key)?.onPress?.();
      void completar();
      return;
    }
    setIndice((i) => i + 1);
  }

  const recorte = retangulo
    ? (() => {
        const y = Math.max(retangulo.y - PADDING_RECORTE, 0);
        const base = Math.min(retangulo.y + retangulo.height + PADDING_RECORTE, alturaTela);
        return {
          x: retangulo.x - PADDING_RECORTE,
          y,
          width: retangulo.width + PADDING_RECORTE * 2,
          height: Math.max(base - y, 0),
        };
      })()
    : null;

  const ESPACO_MINIMO_BALAO = 260;
  let topoBalao: number | undefined;
  let baseBalao: number | undefined;
  if (recorte) {
    const espacoAbaixo = alturaTela - (recorte.y + recorte.height);
    const espacoAcima = recorte.y;
    if (espacoAbaixo >= ESPACO_MINIMO_BALAO) {
      topoBalao = recorte.y + recorte.height + space.lg;
    } else if (espacoAcima >= ESPACO_MINIMO_BALAO) {
      baseBalao = alturaTela - recorte.y + space.lg;
    } else {
      baseBalao = space.xxl;
    }
  } else {
    baseBalao = space.xxl;
  }

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={dispensar}>
      <View style={StyleSheet.absoluteFill}>
        {recorte ? (
          <>
            <Svg width={larguraTela} height={alturaTela} style={StyleSheet.absoluteFill}>
              <Defs>
                <Mask id="recorteWalkthrough">
                  <Rect x={0} y={0} width={larguraTela} height={alturaTela} fill="white" />
                  <Rect
                    x={recorte.x}
                    y={recorte.y}
                    width={recorte.width}
                    height={recorte.height}
                    rx={radius.md}
                    fill="black"
                  />
                </Mask>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={larguraTela}
                height={alturaTela}
                fill="black"
                fillOpacity={0.62}
                mask="url(#recorteWalkthrough)"
              />
            </Svg>

            <View
              pointerEvents="none"
              style={[
                estilos.anelRecorte,
                {
                  left: recorte.x,
                  top: recorte.y,
                  width: recorte.width,
                  height: recorte.height,
                  borderRadius: radius.md,
                },
              ]}
            />
          </>
        ) : null}

        <View
          style={[
            estilos.balaoContainer,
            topoBalao != null ? { top: topoBalao } : { bottom: baseBalao ?? space.xxl },
          ]}
        >
          <Card style={estilos.balao}>
            <Overline color={scheme.gold}>{`Passo ${indice + 1} de ${item.steps.length}`}</Overline>
            <GoldRule align="left" width={40} style={{ marginTop: space.sm, marginBottom: space.md }} />

            <Text variant="heading" font="serif">
              {passo.title}
            </Text>
            <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.xs }}>
              {passo.body}
            </Text>

            <View style={estilos.acoes}>
              <Button
                label="Pular"
                variant="ghost"
                textColor={scheme.textMuted}
                onPress={dispensar}
                disabled={resolvendo}
                style={estilos.botaoPular}
              />
              <Button
                label={ultimo ? item.cta_label : 'Próximo'}
                icon={ultimo ? undefined : 'arrow-forward'}
                size="sm"
                onPress={avancarOuConcluir}
                loading={resolvendo}
                disabled={resolvendo}
                style={estilos.botaoAvancar}
              />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    anelRecorte: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: scheme.gold,
    },
    balaoContainer: {
      position: 'absolute',
      left: space.gutter,
      right: space.gutter,
    },
    balao: {
      ...shadow.raised,
    },
    acoes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.xl,
      gap: space.md,
    },
    botaoPular: {
      width: undefined,
    },
    botaoAvancar: {
      width: undefined,
      minWidth: 120,
    },
  });
}
