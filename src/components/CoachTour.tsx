import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, StyleSheet, View, type View as RNView } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import { useTheme } from '../theme/ThemeContext';
import { radius, shadow, space, type Scheme } from '../theme/tokens';
import { Button, Card, GoldRule, Overline, Text } from './ui';

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
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
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

  // Recorte limitado a tela: alvos mais altos que a viewport (a reflexao
  // inteira, por exemplo — ReflexaoReader.tsx nao e virtualizado, entao
  // measureInWindow devolve a altura do conteudo rolavel inteiro, nao so a
  // parte visivel) nao podem esticar o aro nem o calculo do balao para fora
  // da tela.
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

  // Prefere o lado (acima/abaixo do recorte) com mais espaco livre. Se nenhum
  // dos dois tiver espaco suficiente para o balao — caso de um recorte que
  // ja ocupa quase a tela toda — cai para uma posicao fixa perto da base,
  // sempre alcancavel.
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
