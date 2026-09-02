/**
 * Primitivos de UI.
 *
 * Existem para que nenhuma tela precise lembrar de tres coisas que a web erra
 * ou nao tem: a fonte certa em cada papel, o teto do Dynamic Type, e o estado
 * de "pressionado" — que substitui todo o `hover:` do Tailwind da web, inutil
 * num touchscreen.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { MAX_FONT_SCALE, fonts, radius, schemes, type } from '../theme/tokens';

const scheme = schemes.light;

type Variant = keyof typeof type;

interface TextProps extends RNTextProps {
  variant?: Variant;
  /** Cormorant Garamond, para referencias biblicas e titulos de secao. */
  display?: boolean;
  weight?: 'regular' | 'semi' | 'bold';
  color?: string;
}

export function Text({
  variant = 'body',
  display = false,
  weight = 'regular',
  color,
  style,
  ...rest
}: TextProps) {
  const family = display
    ? weight === 'bold'
      ? fonts.displayBold
      : fonts.display
    : weight === 'bold'
      ? fonts.bodyBold
      : weight === 'semi'
        ? fonts.bodySemi
        : fonts.body;

  return (
    <RNText
      // Num app de leitura diaria, ignorar o tamanho de texto acessivel do
      // sistema nao e opcao; deixar escalar sem teto quebra os cards.
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[
        type[variant],
        { fontFamily: family, color: color ?? scheme.textPrimary },
        style,
      ]}
      {...rest}
    />
  );
}

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const inativo = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: loading }}
      disabled={inativo}
      style={({ pressed }) => [
        styles.button,
        isPrimary && { backgroundColor: scheme.accent },
        variant === 'secondary' && {
          backgroundColor: scheme.surface,
          borderWidth: 1,
          borderColor: scheme.border,
        },
        isGhost && { backgroundColor: 'transparent' },
        // Substitui o hover: da web. Sem isto o toque nao tem retorno nenhum.
        pressed && { opacity: 0.7 },
        inativo && { opacity: 0.5 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : scheme.accent} />
      ) : (
        <Text
          variant="body"
          weight="semi"
          color={isPrimary ? '#FFFFFF' : isGhost ? scheme.textSecondary : scheme.textPrimary}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * Estado vazio ou de erro em tela cheia.
 *
 * Vale para os casos que a API do fidio produz com frequencia e que a web
 * trata mal: o dia sem reflexao publicada, o link expirado (410), o limite de
 * leituras (429).
 */
export function EmptyState({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text variant="title" display weight="bold" style={{ textAlign: 'center' }}>
        {titulo}
      </Text>
      {descricao ? (
        <Text
          variant="body"
          color={scheme.textSecondary}
          style={{ textAlign: 'center', marginTop: 8 }}
        >
          {descricao}
        </Text>
      ) : null}
      {acao ? <View style={{ marginTop: 24 }}>{acao}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: scheme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: scheme.border,
    padding: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
});

export { scheme };
