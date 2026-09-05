/**
 * Botoes de login social (Google e Apple), compartilhados por login e registro.
 *
 * Estavam como variantes do `Button` de ui.tsx, e o da Apple saia quase branco:
 * a variante herdava o corpo claro dos outros botoes e so pintava o fundo, o
 * que a HIG da Apple nao aceita e a App Review olha justamente nesta tela.
 *
 * O modelo aqui e o do lexa-mobile:
 *
 * - Apple: o `AppleAuthenticationButton` NATIVO, no estilo BLACK. E o unico
 *   jeito garantidamente conforme (a Apple exige a marca, o texto e o contraste
 *   dela), e de quebra e impossivel ele sair claro — `backgroundColor` e
 *   `borderRadius` via `style` sao proibidos pelo proprio componente, so
 *   `buttonStyle` e `cornerRadius`. O preco e nao ter a profundidade do Google;
 *   `cornerRadius` ao menos alinha o arredondamento.
 * - Google: um Pressable nosso, com a PROFUNDIDADE do PushButton do lexa. A
 *   versao anterior era um contorno de 1px com `shadow.card` — sobre o creme,
 *   uma borda quase da cor do fundo mais uma sombra de 6% nao desenhavam
 *   recipiente nenhum, e o que sobrava lia como um link de texto. A aresta
 *   inferior solida de 4px e o que faz ele existir como objeto.
 *
 * Os dois compartilham ALTURA e canto para empilharem sem degrau.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { space } from '../theme/tokens';
import { GoogleLogo, Text, scheme } from './ui';

/**
 * Altura dos dois botoes.
 *
 * No Google ela nao e imposta: sai da conta do lexa (borda 2 + padding 14 +
 * linha 20 + padding 14 + aresta 4). O numero existe aqui porque o botao nativo
 * da Apple nao reflui e precisa dela explicita.
 */
const ALTURA = 54;

/** `pushDepth.button` do lexa: a espessura da aresta inferior. */
const PROFUNDIDADE = 4;

/** `radius.lg` do lexa. A escala do feith nao tem 16 (md=14, lg=20). */
const RAIO = 16;

/**
 * Tom escuro da aresta inferior. O lexa usa #D5C9B2 sobre a borda #EFE5D3;
 * este e o equivalente sobre a borda #E6E0D4 do feith.
 */
const PROFUNDIDADE_COR = '#D2C7B0';

/** Opacidade do `inativo` do `Button`, repetida para os estados baterem. */
const OPACIDADE_INATIVA = 0.45;

interface SocialButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GoogleButton({
  onPress,
  disabled = false,
  loading = false,
  style,
}: SocialButtonProps) {
  const [pressionado, setPressionado] = useState(false);
  const inativo = disabled || loading;

  /**
   * Ao pressionar, a aresta encolhe e o conteudo desce na mesma medida: o botao
   * afunda sem que a altura total mude, entao nada abaixo dele pula. E o truque
   * do PushButton do lexa — a web faz isso com `box-shadow` + `translate-y`,
   * que o RN nao tem de forma confiavel entre plataformas.
   */
  const afundou = pressionado && !inativo ? PROFUNDIDADE - 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuar com o Google"
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      onPressIn={() => setPressionado(true)}
      onPressOut={() => setPressionado(false)}
      // `loading` fica de fora: um botao ocupado nao esta indisponivel, e apagar
      // o botao no meio do login pareceria que o toque nao pegou.
      style={[{ opacity: disabled && !loading ? OPACIDADE_INATIVA : 1 }, style]}
    >
      <View
        style={{
          backgroundColor: scheme.surface,
          borderWidth: 2,
          borderColor: scheme.border,
          borderBottomWidth: PROFUNDIDADE - afundou,
          borderBottomColor: PROFUNDIDADE_COR,
          borderRadius: RAIO,
          paddingVertical: 14 + afundou,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {loading ? (
          // Mesma altura de linha do rotulo, para o spinner nao encolher o botao.
          <ActivityIndicator color={scheme.textPrimary} style={{ height: 20 }} />
        ) : (
          <>
            <GoogleLogo size={18} />
            <Text
              variant="bodySm"
              font="bodySemi"
              color={scheme.textPrimary}
              style={{ fontSize: 16, lineHeight: 20, letterSpacing: 0.3 }}
            >
              Continuar com o Google
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

interface AppleButtonProps extends SocialButtonProps {
  /**
   * `continue` no login, `signUp` no registro: o texto vem da Apple, ja
   * localizado, e usar o errado e o tipo de detalhe que a review anota.
   */
  tipo?: 'continue' | 'signUp';
}

export function AppleButton({
  onPress,
  disabled = false,
  loading = false,
  tipo = 'continue',
  style,
}: AppleButtonProps) {
  if (loading) {
    // O nativo nao tem estado de carregamento; trocamos por um bloco da mesma
    // altura e da mesma cor, para a coluna de botoes nao pular.
    return (
      <View
        style={[
          {
            height: ALTURA,
            borderRadius: RAIO,
            backgroundColor: '#000000',
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[disabled && { opacity: OPACIDADE_INATIVA }, style]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          tipo === 'signUp'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        }
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={RAIO}
        // Sem width/height explicitos o botao nativo simplesmente nao aparece.
        style={{ width: '100%', height: ALTURA }}
        onPress={() => {
          if (!disabled) onPress();
        }}
      />
    </View>
  );
}

/**
 * Separador "ou" entre o formulario e os provedores.
 *
 * Sem ele os botoes empilhados parecem alternativas de igual peso; com ele fica
 * claro que ha um caminho principal e dois atalhos. Vive aqui, e nao em cada
 * tela, para login e registro nao divergirem.
 */
export function Separador({ children = 'ou' }: { children?: string }) {
  return (
    <View style={estilos.separador}>
      <View style={estilos.fio} />
      <Text variant="overline" color={scheme.textGhost} style={{ textTransform: 'uppercase' }}>
        {children}
      </Text>
      <View style={estilos.fio} />
    </View>
  );
}

const estilos = StyleSheet.create({
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: space.xxl,
  },
  fio: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: scheme.border,
  },
});
