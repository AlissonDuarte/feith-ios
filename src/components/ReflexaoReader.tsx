/**
 * O leitor de reflexao — o coracao do app.
 *
 * Porte de front_fide/src/components/home/TextReader.svelte, com as mesmas seis
 * secoes na mesma ordem. Tres diferencas obrigatorias:
 *
 *   1. A web faz `{@html marked.parse(texto)}`. Nao existe DOM aqui, entao o
 *      Markdown vai para o react-native-marked, que envolve o MESMO parser
 *      (`marked`) que a web usa — as diferencas de renderizacao ficam minimas.
 *   2. Um unico scrollable. Aninhar lista dentro de scroll no RN quebra o
 *      gesto e derruba a performance.
 *   3. As secoes NAO sao cards brancos como na web. Numa coluna de 375px, seis
 *      caixas empilhadas com moldura viram seis paredes; o texto e o objeto
 *      principal da tela e precisa correr sobre o papel. O que separa uma
 *      secao da outra e o numeral, o fio de ouro e o espaco — que e como um
 *      livro faz.
 */
import { useWindowDimensions, View } from 'react-native';
import Markdown from 'react-native-marked';

import { formatLongPT } from '../api/dates';
import type { Reflection, SharedReflection } from '../api/types';
import { REFLECTION_SECTIONS, fonts, schemes, space, type } from '../theme/tokens';
import { EndMark, QuoteMark, SectionNumeral } from './ornaments';
import { GoldRule, Overline, Text } from './ui';

const scheme = schemes.light;

/** Aceita tanto a reflexao completa quanto a versao publica do link curto. */
type Lida = Reflection | SharedReflection;

/**
 * Um bloco de Markdown.
 *
 * `largura` e passada de fora porque a FlatList interna do react-native-marked,
 * aninhada num ScrollView, nao herda largura nenhuma: sem um numero explicito
 * os paragrafos colapsam para a largura da palavra mais longa.
 */
function Corpo({ texto, largura }: { texto: string; largura: number }) {
  return (
    <Markdown
      value={texto}
      flatListProps={{
        // O leitor inteiro ja rola; esta lista so mede.
        scrollEnabled: false,
        initialNumToRender: 30,
        contentContainerStyle: { paddingHorizontal: 0 },
      }}
      styles={{
        text: {
          ...type.body,
          fontFamily: fonts.body,
          color: scheme.textPrimary,
        },
        paragraph: { paddingVertical: 7, width: largura },
        strong: { fontFamily: fonts.bodySemi, color: scheme.textPrimary },
        em: { fontFamily: fonts.body, fontStyle: 'italic' },
        link: { color: scheme.accent, textDecorationLine: 'underline' },
        // Citacao: fio de OURO, nao barra colorida. E o mesmo fio que separa
        // as secoes, e mantem a citacao dentro da mesma linguagem.
        blockquote: {
          borderLeftWidth: 2,
          borderLeftColor: scheme.goldSoft,
          backgroundColor: 'transparent',
          paddingLeft: 18,
          marginVertical: space.md,
        },
        list: { width: largura, marginVertical: space.xs },
        li: { ...type.body, fontFamily: fonts.body, color: scheme.textPrimary },
        // Subtitulos dentro de uma secao: serifada, para nao competirem com o
        // titulo da secao nem virarem outro bloco em negrito.
        h1: { ...type.heading, fontFamily: fonts.serifSemi, color: scheme.textPrimary },
        h2: { ...type.heading, fontFamily: fonts.serifSemi, color: scheme.textPrimary },
        h3: { ...type.heading, fontFamily: fonts.serif, color: scheme.textSecondary },
        hr: { backgroundColor: scheme.border, height: 1, marginVertical: space.xl },
        codespan: {
          fontFamily: fonts.body,
          fontStyle: 'italic',
          color: scheme.accent,
          backgroundColor: 'transparent',
        },
      }}
    />
  );
}

export function ReflexaoReader({
  reflexao,
  /** Largura util da coluna de texto. Default: tela menos as margens padrao. */
  largura,
}: {
  reflexao: Lida;
  largura?: number;
}) {
  const { width } = useWindowDimensions();
  const coluna = largura ?? width - space.gutter * 2;

  return (
    <View>
      {/* ── Frontispicio ──────────────────────────────────────────────────
          Centrado, como a abertura de um capitulo: etiqueta da versao,
          referencia em serifada leve, fio de ouro, data. E o `header` central
          do TextReader.svelte, sem o ambar. */}
      <View style={{ alignItems: 'center', paddingTop: space.sm }}>
        {reflexao.version ? <Overline>{reflexao.version}</Overline> : null}

        <Text
          variant="hero"
          accessibilityRole="header"
          style={{ textAlign: 'center', marginTop: space.md }}
        >
          {reflexao.scripture_reference}
        </Text>

        <GoldRule width={64} style={{ marginTop: space.xl }} />

        <Text variant="micro" color={scheme.textGhost} style={{ marginTop: space.xl }}>
          {formatLongPT(reflexao.publishAt)}
        </Text>
      </View>

      {/* ── Texto biblico ─────────────────────────────────────────────────
          Destaque, e nao uma das etapas numeradas. Pergaminho com fio de ouro
          em cima e embaixo: e a unica coisa na tela que nao foi escrita por
          um comentarista, e precisa parecer diferente por isso. */}
      <View style={{ marginTop: space.section }}>
        <GoldRule width="100%" />
        <View
          style={{
            backgroundColor: scheme.canvasWarm,
            paddingHorizontal: space.xl,
            paddingTop: space.lg,
            paddingBottom: space.xl,
          }}
        >
          <QuoteMark size={62} style={{ marginLeft: -4 }} />
          <Text
            style={{
              fontFamily: fonts.serif,
              fontSize: 22,
              lineHeight: 34,
              color: scheme.textSecondary,
              marginTop: -6,
            }}
          >
            {reflexao.bible_text}
          </Text>
        </View>
        <GoldRule width="100%" />
      </View>

      {/* ── As cinco etapas da exegese ────────────────────────────────────
          Numeradas como em TextReader.svelte. */}
      {REFLECTION_SECTIONS.map((secao, i) => {
        const conteudo = reflexao[secao.key];
        if (!conteudo) return null;

        return (
          <View key={secao.key} style={{ marginTop: space.section }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <SectionNumeral n={i + 1} />
              <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                {secao.title}
              </Text>
            </View>

            <GoldRule align="left" width={40} style={{ marginTop: space.lg, marginBottom: space.md }} />

            <Corpo texto={conteudo} largura={coluna} />
          </View>
        );
      })}

      <EndMark />
    </View>
  );
}
