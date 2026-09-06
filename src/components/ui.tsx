/**
 * Primitivos de UI.
 *
 * Existem para que nenhuma tela precise lembrar de quatro coisas: a fonte certa
 * em cada papel, o teto do Dynamic Type, o estado de "pressionado" — que
 * substitui todo o `hover:` do Tailwind da web, inutil num touchscreen — e as
 * proporcoes da identidade editorial (canto reto, fio de ouro, maiuscula
 * espacada).
 *
 * A regra que organiza o conjunto: a SERIFADA nomeia (referencias biblicas,
 * titulos de tela e de secao) e a SANS explica (corpo, metadados, rotulos de
 * botao). Misturar os dois papeis e o que fazia a tela parecer um documento sem
 * folha de estilo.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text as RNText,
  type TextProps as RNTextProps,
  TextInput,
  type TextInputProps,
  type StyleProp,
  StyleSheet,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { MAX_FONT_SCALE, fonts, radius, schemes, shadow, space, type } from '../theme/tokens';

const scheme = schemes.light;

// ── Texto ────────────────────────────────────────────────────────────────────

type Variant = keyof typeof type;
type FontRole = keyof typeof fonts;

/**
 * Fonte padrao de cada variante.
 *
 * Assim `<Text variant="display">` ja sai serifado leve e `<Text>` ja sai em
 * Inter, sem que a tela precise dizer — que e como o erro de misturar os dois
 * papeis acontecia.
 */
const FONTE_PADRAO: Record<Variant, FontRole> = {
  hero: 'display',
  display: 'display',
  title: 'display',
  heading: 'bodySemi',
  body: 'body',
  bodySm: 'body',
  caption: 'body',
  overline: 'bodySemi',
  micro: 'body',
};

interface TextProps extends RNTextProps {
  variant?: Variant;
  /** Sobrepoe a fonte padrao da variante. */
  font?: FontRole;
  color?: string;
}

export function Text({ variant = 'body', font, color, style, ...rest }: TextProps) {
  return (
    <RNText
      // Num app de leitura diaria, ignorar o tamanho de texto acessivel do
      // sistema nao e opcao; deixar escalar sem teto quebra os cards.
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[
        type[variant],
        { fontFamily: fonts[font ?? FONTE_PADRAO[variant]], color: color ?? scheme.textPrimary },
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * Etiqueta em maiuscula espacada — o `text-xs uppercase tracking-widest` que
 * abre cada secao da landing.
 *
 * O texto e transformado aqui, e nao escrito em caixa alta na tela: o VoiceOver
 * le "HOJE" letra por letra, e "Hoje" como palavra.
 */
export function Overline({
  children,
  color = scheme.textGhost,
  style,
}: {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text variant="overline" color={color} style={[{ textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

/**
 * Espaco que a tab bar translucida ocupa.
 *
 * Ela e `position: absolute`, entao o conteudo rola por baixo dela — e sem
 * este respiro no fim da lista o ultimo item fica permanentemente encoberto.
 * O numero vem da safe area e nao de uma constante: 83px num iPhone com
 * indicador de home e 49px num com botao.
 */
export function useEspacoTabBar() {
  const insets = useSafeAreaInsets();
  const altura = ALTURA_TAB_BAR + insets.bottom;
  return { altura, respiro: altura + space.xxl };
}

/** Altura da barra em si, sem a safe area. E o padrao do iOS. */
const ALTURA_TAB_BAR = 49;

// ── Fios ─────────────────────────────────────────────────────────────────────

/**
 * O fio de ouro — `.divider-gold` da landing.
 *
 * Centrado, desvanece para os dois lados; a esquerda, so para a direita. Um
 * fio solido no lugar deste vira um `border-bottom` qualquer e perde
 * exatamente a qualidade que ele carrega. Precisa de SVG: empilhar Views com
 * opacidades diferentes produziria as faixas que o gradiente evita.
 */
export function GoldRule({
  width = 60,
  align = 'center',
  color = scheme.gold,
  style,
}: {
  width?: number | `${number}%`;
  align?: 'center' | 'left';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const id = align === 'center' ? 'ruleC' : 'ruleL';

  // Array e nao Fragment: `<LinearGradient>` do react-native-svg tipa os
  // filhos como lista de elementos, e um Fragment nao satisfaz esse tipo.
  const paradas =
    align === 'center'
      ? [
          <Stop key="0" offset="0" stopColor={color} stopOpacity={0} />,
          <Stop key="1" offset="0.5" stopColor={color} stopOpacity={0.85} />,
          <Stop key="2" offset="1" stopColor={color} stopOpacity={0} />,
        ]
      : [
          <Stop key="0" offset="0" stopColor={color} stopOpacity={0.85} />,
          <Stop key="1" offset="1" stopColor={color} stopOpacity={0} />,
        ];

  return (
    <View
      style={[{ height: 1, width, alignSelf: align === 'center' ? 'center' : 'flex-start' }, style]}
    >
      <Svg width="100%" height={1} viewBox="0 0 100 1" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            {paradas}
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Hairline neutro, para separar itens dentro de um mesmo bloco. */
export function Hairline({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: scheme.border, marginLeft: inset },
        style,
      ]}
    />
  );
}

// ── Cabecalho de tela ────────────────────────────────────────────────────────

/**
 * Cabecalho editorial das telas de aba.
 *
 * Etiqueta em maiuscula, titulo serifado leve, fio de ouro. E a mesma abertura
 * de toda secao da landing, e e o que faz uma lista parecer um capitulo em vez
 * de uma tabela.
 */
export function ScreenHeader({
  overline,
  title,
  right,
  style,
}: {
  overline?: string;
  title: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ paddingHorizontal: space.gutter, paddingTop: space.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          {overline ? <Overline style={{ marginBottom: 6 }}>{overline}</Overline> : null}
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right ? <View style={{ paddingBottom: 4, paddingLeft: space.lg }}>{right}</View> : null}
      </View>
      <GoldRule align="left" width={56} style={{ marginTop: space.md }} />
    </View>
  );
}

// ── Botoes ───────────────────────────────────────────────────────────────────

/**
 * O "G" oficial do Google, em SVG.
 *
 * Exportado porque quem o desenha e o GoogleButton de SocialAuth.tsx: a marca e
 * obrigatoria e nao pode ser recolorida, entao vive como asset e nao como
 * Ionicon monocromatico.
 */
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

/**
 * `primary` e o oxblood solido; `secondary` o contorno oxblood; `quiet` um
 * contorno neutro para a acao que acompanha uma primaria sem competir com ela
 * (o "Cancelar" ao lado do "Salvar"); `ghost` e um link de texto.
 *
 * Google e Apple nao sao variantes daqui: as marcas deles tem regras proprias,
 * e moram em SocialAuth.tsx.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Icone a direita do rotulo, como a seta do CTA da landing. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icone a esquerda do rotulo. */
  iconLeft?: keyof typeof Ionicons.glyphMap;
  size?: 'md' | 'sm';
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  icon,
  iconLeft,
  size = 'md',
  textColor,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const inativo = disabled || loading;
  const solido = variant === 'primary';
  const comoLink = variant === 'ghost';

  /**
   * Um solido desabilitado nao pode ser "o mesmo botao com opacidade": oxblood
   * a 45% sobre o creme da um rosa lavado que le como branco, e o rotulo branco
   * junto quase some — era o "Salvar lembrete" sumindo quando nenhum dia estava
   * marcado. Desabilitado ele vira corpo cinza-quente com rotulo escuro:
   * continua visivel, e continua obviamente inerte.
   *
   * `loading` fica de fora: um botao ocupado nao esta indisponivel, e trocar a
   * cor no meio do salvamento pareceria outro botao.
   */
  const solidoInerte = solido && !!disabled && !loading;

  const corDoRotulo = textColor
    ? textColor
    : solidoInerte
      ? scheme.textSecondary
      : solido
        ? scheme.onAccent
        : variant === 'quiet'
          ? scheme.textSecondary
          : comoLink
            ? scheme.textSecondary
            : scheme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: loading }}
      disabled={inativo}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && { minHeight: 44 },
        comoLink && styles.buttonLink,
        solido && !solidoInerte && (pressed ? styles.buttonPrimaryPressed : styles.buttonPrimary),
        solido && !inativo && shadow.card,
        solidoInerte && styles.buttonInerte,
        variant === 'secondary' &&
          (pressed ? styles.buttonSecondaryPressed : styles.buttonSecondary),
        variant === 'quiet' && (pressed ? styles.buttonQuietPressed : styles.buttonQuiet),
        comoLink && pressed && { opacity: 0.55 },
        !solido && inativo && { opacity: 0.4 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={solido && !solidoInerte ? scheme.onAccent : scheme.accent} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {iconLeft ? <Ionicons name={iconLeft} size={16} color={corDoRotulo} /> : null}
          <Text
            variant={comoLink ? 'bodySm' : 'micro'}
            font={comoLink ? 'bodyMedium' : 'bodySemi'}
            color={corDoRotulo}
            style={comoLink ? undefined : styles.buttonLabel}
          >
            {comoLink ? label : label.toUpperCase()}
          </Text>
          {icon ? <Ionicons name={icon} size={comoLink ? 14 : 13} color={corDoRotulo} /> : null}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Botao so de icone, em circulo de fio.
 *
 * Usado no cabecalho da leitura (favoritar, compartilhar), onde um botao com
 * rotulo roubaria a linha do titulo.
 */
export function IconButton({
  name,
  onPress,
  label,
  color = scheme.textSecondary,
  size = 20,
  ativo = false,
  disabled,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Rotulo de acessibilidade — obrigatorio: nao ha texto visivel. */
  label: string;
  color?: string;
  size?: number;
  ativo?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: ativo, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        ativo && { borderColor: scheme.goldSoft, backgroundColor: scheme.goldSubtle },
        pressed && { opacity: 0.5 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={name} size={size} color={ativo ? scheme.gold : color} />
    </Pressable>
  );
}

// ── Superficies ──────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  /** Sem sombra nem fundo branco: para blocos de aviso dentro do canvas. */
  quiet = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  quiet?: boolean;
}) {
  return (
    <View style={[quiet ? styles.cardQuiet : styles.card, style]}>{children}</View>
  );
}

/**
 * Card tocavel.
 *
 * Separado do Card porque o retorno ao toque nao e opcional: um card que abre
 * uma tela e nao afunda ao ser pressionado parece um card quebrado.
 */
export function TouchableCard({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: scheme.canvasWarm, borderColor: scheme.goldSoft },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Etiqueta pequena — plano, contagem de anotacoes, streak.
 *
 * Canto reto e fio de 1px: a mesma logica dos CTAs. Um chip arredondado e
 * colorido aqui traria de volta a linguagem de dashboard.
 */
export function Tag({
  children,
  icon,
  color = scheme.textSecondary,
  border = scheme.border,
  background = 'transparent',
}: {
  children: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  border?: string;
  background?: string;
}) {
  return (
    <View style={[styles.tag, { borderColor: border, backgroundColor: background }]}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text variant="overline" font="bodySemi" color={color} style={{ textTransform: 'uppercase' }}>
        {children}
      </Text>
    </View>
  );
}

// ── Formulario ───────────────────────────────────────────────────────────────

interface FieldProps extends TextInputProps {
  /** Etiqueta em maiuscula acima do campo. Ausente = campo sem rotulo. */
  label?: string;
  /** Mensagem de erro sob o campo. */
  erro?: string | null;
  /** Texto de ajuda sob o campo, quando nao ha erro. */
  ajuda?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Campo de texto.
 *
 * O foco muda a cor do fio para oxblood. Parece detalhe, mas e o unico retorno
 * visual que um campo da para quem esta digitando — sem ele, todos os quatro
 * campos do cadastro parecem igualmente inertes.
 */
export function Field({ label, erro, ajuda, containerStyle, style, ...rest }: FieldProps) {
  const [focado, setFocado] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? <Overline style={{ marginBottom: space.sm }}>{label}</Overline> : null}
      <TextInput
        placeholderTextColor={scheme.textGhost}
        {...rest}
        onFocus={(e) => {
          setFocado(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.field,
          focado && { borderColor: scheme.accent, backgroundColor: scheme.surface },
          erro ? { borderColor: scheme.accent } : null,
          style,
        ]}
      />
      {erro ? (
        <Text variant="caption" color={scheme.accent} style={{ marginTop: 6 }}>
          {erro}
        </Text>
      ) : ajuda ? (
        <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 6 }}>
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Linha de lista no padrao iOS: rotulo, valor opcional, chevron.
 *
 * Substitui as pilhas de botoes que a tela de perfil tinha. Uma coluna de
 * botoes secundarios identicos nao da hierarquia nenhuma — a lista agrupada e
 * o que o iOS usa para exatamente este caso, e e o que a pessoa reconhece.
 */
export function ListRow({
  label,
  value,
  icon,
  iconColor,
  iconBg,
  onPress,
  destrutivo = false,
  ultimo = false,
}: {
  label: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress: () => void;
  destrutivo?: boolean;
  ultimo?: boolean;
}) {
  const cor = destrutivo ? scheme.accent : scheme.textPrimary;

  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.rowPressable,
          pressed && { backgroundColor: scheme.canvasWarm },
        ]}
      >
        <View style={styles.row}>
          {icon ? (
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: iconBg ?? (destrutivo ? '#FBF0EF' : scheme.canvasWarm),
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={17}
                color={iconColor ?? (destrutivo ? scheme.accent : scheme.textSecondary)}
              />
            </View>
          ) : null}
          <Text
            variant="body"
            font="bodyMedium"
            color={cor}
            style={[styles.rowLabel, !icon && { marginLeft: 0 }]}
          >
            {label}
          </Text>
          {value ? (
            <Text variant="bodySm" color={scheme.textMuted} style={styles.rowValue}>
              {value}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={scheme.textGhost} />
        </View>
      </Pressable>
      {ultimo ? null : <Hairline inset={icon ? 62 : space.lg} />}
    </>
  );
}

/** Agrupa ListRows numa ficha unica, como a Settings do iOS. */
export function RowGroup({
  children,
  titulo,
  style,
}: {
  children: React.ReactNode;
  titulo?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      {titulo ? (
        <Overline style={{ marginBottom: space.sm, marginLeft: space.xs }}>{titulo}</Overline>
      ) : null}
      <View style={styles.rowGroup}>{children}</View>
    </View>
  );
}

// ── Estados ──────────────────────────────────────────────────────────────────

/**
 * Estado vazio ou de erro em tela cheia.
 *
 * Vale para os casos que a API do feith produz com frequencia e que a web
 * trata mal: o dia sem reflexao publicada, o link expirado (410), o limite de
 * leituras (429). Com ornamento e titulo serifado, porque um estado vazio e a
 * tela em que a marca aparece sozinha — sem conteudo para dividir a atencao.
 */
export function EmptyState({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  icone?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.empty}>
      {icone ? (
        <View style={styles.emptyIcon}>
          <Ionicons name={icone} size={22} color={scheme.gold} />
        </View>
      ) : null}
      <Text variant="title" style={{ textAlign: 'center' }}>
        {titulo}
      </Text>
      <GoldRule width={48} style={{ marginTop: space.lg }} />
      {descricao ? (
        <Text
          variant="bodySm"
          color={scheme.textSecondary}
          style={{ textAlign: 'center', marginTop: space.lg }}
        >
          {descricao}
        </Text>
      ) : null}
      {acao ? <View style={{ marginTop: space.xxl, alignSelf: 'stretch' }}>{acao}</View> : null}
    </View>
  );
}

/** Spinner centrado no canvas, para a primeira carga de uma tela. */
export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={scheme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    // Canto reto: `border-radius: 0` da `.cta-gold` da landing, com 2px para
    // a aresta nao ficar agressiva sob o dedo.
    borderRadius: radius.sharp,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonPrimary: {
    backgroundColor: scheme.accent,
  },
  buttonPrimaryPressed: {
    backgroundColor: scheme.accentPressed,
  },
  buttonQuiet: {
    borderWidth: 1,
    borderColor: scheme.textGhost,
    backgroundColor: scheme.canvasWarm,
  },
  buttonQuietPressed: {
    backgroundColor: scheme.border,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: scheme.accent,
    backgroundColor: scheme.surface,
  },
  buttonSecondaryPressed: {
    backgroundColor: scheme.accentSubtle,
  },
  buttonInerte: {
    backgroundColor: scheme.border,
    borderWidth: 1,
    borderColor: scheme.textGhost,
  },
  buttonLink: {
    minHeight: 44,
    borderRadius: radius.sm,
  },
  buttonLabel: {
    // `letter-spacing: 0.25em` da landing, no tamanho do rotulo.
    letterSpacing: 2.4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: scheme.border,
    // Corpo quente, e nao branco: estes circulos vivem sobre o creme dos
    // cabecalhos, e branco-sobre-creme com fio de 9% nao le como botao.
    backgroundColor: scheme.canvasWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: scheme.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: scheme.borderSoft,
    padding: 20,
    ...shadow.card,
  },
  cardQuiet: {
    backgroundColor: scheme.canvasWarm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: scheme.border,
    padding: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.sharp,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  field: {
    minHeight: 54,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 17,
    color: scheme.textPrimary,
  },
  rowPressable: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    paddingHorizontal: space.lg,
  },
  rowLabel: {
    flex: 1,
    marginLeft: 14,
  },
  rowValue: {
    marginRight: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowGroup: {
    backgroundColor: scheme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: scheme.borderSoft,
    overflow: 'hidden',
    ...shadow.card,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 56,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: scheme.goldSoft,
    backgroundColor: scheme.goldSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
});

export { scheme };
