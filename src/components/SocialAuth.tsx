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
 *   `buttonStyle` e `cornerRadius`.
 * - Google: um Pressable nosso. O SDK traz um botao pronto, mas ele ignora o
 *   visual do feith; aqui ele nasce irmao do "Entrar" logo acima — mesma
 *   altura, mesmo canto reto, mesma sombra — so trocando o oxblood solido por
 *   um corpo claro de contorno, porque duas primarias na mesma tela competem.
 *
 * Os dois compartilham ALTURA e canto para empilharem sem degrau.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, shadow, space } from '../theme/tokens';
import { GoogleLogo, Text, scheme } from './ui';

/** Mesma altura minima do `Button` de ui.tsx, para os tres empilharem retos. */
const ALTURA = 54;

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
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuar com o Google"
      accessibilityState={{ disabled: inativo, busy: loading }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: ALTURA,
          borderRadius: radius.sharp,
          borderWidth: 1,
          borderColor: pressed ? scheme.textGhost : scheme.border,
          backgroundColor: pressed ? scheme.canvasWarm : scheme.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 24,
        },
        !inativo && shadow.card,
        inativo && { opacity: OPACIDADE_INATIVA },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={scheme.textPrimary} />
      ) : (
        <>
          <GoogleLogo size={18} />
          <Text variant="bodySm" font="bodySemi" color={scheme.textPrimary}>
            Continuar com o Google
          </Text>
        </>
      )}
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
  // Sombra e opacidade ficam no wrapper: `backgroundColor` e `borderRadius`
  // sao proibidos no `style` do botao nativo, e a sombra so pega no pai.
  if (loading) {
    // O nativo nao tem estado de carregamento; trocamos por um bloco da mesma
    // altura e da mesma cor, para a coluna de botoes nao pular.
    return (
      <View
        style={[
          {
            height: ALTURA,
            borderRadius: radius.sharp,
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
    <View
      style={[
        { height: ALTURA, borderRadius: radius.sharp },
        !disabled && shadow.card,
        disabled && { opacity: OPACIDADE_INATIVA },
        style,
      ]}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          tipo === 'signUp'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
        }
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={radius.sharp}
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
