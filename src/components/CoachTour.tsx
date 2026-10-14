import { useEffect, useState } from 'react';
import { Dimensions, Modal, StyleSheet, View, type View as RNView } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { radius, schemes, shadow, space } from '../theme/tokens';
import { Button, Card, GoldRule, Overline, Text } from './ui';

const scheme = schemes.light;

const PADDING_RECORTE = 10;

export interface PassoTour {
  ref: React.RefObject<RNView | null>;
  titulo: string;
  corpo: string;
  raio?: number;
}

interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visivel: boolean;
  passos: PassoTour[];
  onConcluir: (metodo: 'completed' | 'skipped') => void;
}

/**
 * Tour de spotlight sobre elementos reais da tela.
 *
 * Mede cada `ref` com `measureInWindow` — coordenadas de tela, nao de
 * hierarquia de view — entao funciona mesmo o alvo estando "atras" deste
 * Modal. O recorte e feito com uma mascara SVG (branco = visivel, preto =
 * transparente), nao com 4 retangulos manuais.
 */
export function CoachTour({ visivel, passos, onConcluir }: Props) {
  const [indice, setIndice] = useState(0);
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);
  const { width: larguraTela, height: alturaTela } = Dimensions.get('window');

  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  useEffect(() => {
    if (!visivel) {
      setIndice(0);
      setRetangulo(null);
      return;
    }
  }, [visivel]);

  useEffect(() => {
    if (!visivel || !passo) return;
    setRetangulo(null);
    const id = requestAnimationFrame(() => {
      passo.ref.current?.measureInWindow((x, y, width, height) => {
        setRetangulo({ x, y, width, height });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [visivel, passo]);

  if (!visivel || !passo) return null;

  function avancar() {
    if (ultimo) {
      onConcluir('completed');
      return;
    }
    setIndice((i) => i + 1);
  }

  const recorte = retangulo
    ? {
        x: retangulo.x - PADDING_RECORTE,
        y: retangulo.y - PADDING_RECORTE,
        width: retangulo.width + PADDING_RECORTE * 2,
        height: retangulo.height + PADDING_RECORTE * 2,
      }
    : null;

  // Baloes abaixo do recorte, a nao ser que ele esteja na metade de baixo da
  // tela — ai sobe para cima dele, pra nao cair atras da tab bar.
  const abaixo = !recorte || recorte.y < alturaTela / 2;
  const topoBalao = recorte
    ? abaixo
      ? recorte.y + recorte.height + space.lg
      : undefined
    : undefined;
  const baseBalao = recorte && !abaixo ? alturaTela - recorte.y + space.lg : undefined;

  return (
    <Modal visible={visivel} transparent statusBarTranslucent animationType="fade">
      <View style={StyleSheet.absoluteFill}>
        {recorte ? (
          <>
            <Svg width={larguraTela} height={alturaTela} style={StyleSheet.absoluteFill}>
              <Defs>
                <Mask id="recorteTour">
                  <Rect x={0} y={0} width={larguraTela} height={alturaTela} fill="white" />
                  <Rect
                    x={recorte.x}
                    y={recorte.y}
                    width={recorte.width}
                    height={recorte.height}
                    rx={passo.raio ?? radius.md}
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
                mask="url(#recorteTour)"
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
                  borderRadius: passo.raio ?? radius.md,
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
            <Overline color={scheme.gold}>{`Passo ${indice + 1} de ${passos.length}`}</Overline>
            <GoldRule align="left" width={40} style={{ marginTop: space.sm, marginBottom: space.md }} />

            <Text variant="heading" font="serif">
              {passo.titulo}
            </Text>
            <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.xs }}>
              {passo.corpo}
            </Text>

            <View style={estilos.acoes}>
              <Button
                label="Pular"
                variant="ghost"
                textColor={scheme.textMuted}
                onPress={() => onConcluir('skipped')}
                style={estilos.botaoPular}
              />
              <Button
                label={ultimo ? 'Entendi' : 'Próximo'}
                icon={ultimo ? undefined : 'arrow-forward'}
                size="sm"
                onPress={avancar}
                style={estilos.botaoAvancar}
              />
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
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
