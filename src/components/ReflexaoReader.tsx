/**
 * O leitor de reflexao — o coracao do app.
 *
 * Porte de front_fide/src/components/home/TextReader.svelte, com as mesmas seis
 * secoes na mesma ordem. Duas diferencas obrigatorias:
 *
 *   1. A web faz `{@html marked.parse(texto)}`. Nao existe DOM aqui, entao o
 *      Markdown vai para o react-native-marked, que envolve o MESMO parser
 *      (`marked`) que a web usa — as diferencas de renderizacao ficam minimas.
 *   2. Um unico scrollable. Aninhar lista dentro de scroll no RN quebra o
 *      gesto e derruba a performance.
 */
import { useWindowDimensions, View } from 'react-native';
import Markdown from 'react-native-marked';

import { formatLongPT } from '../api/dates';
import type { Reflection, SharedReflection } from '../api/types';
import { REFLECTION_SECTIONS, fonts, radius, schemes, type } from '../theme/tokens';
import { Text } from './ui';

const scheme = schemes.light;

/** Aceita tanto a reflexao completa quanto a versao publica do link curto. */
type Lida = Reflection | SharedReflection;

function SecaoMarkdown({ texto }: { texto: string }) {
  const { width } = useWindowDimensions();

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
        paragraph: { paddingVertical: 6, width: width - 72 },
        strong: { fontFamily: fonts.bodyBold },
        em: { fontFamily: fonts.body, fontStyle: 'italic' },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: scheme.accent,
          paddingLeft: 14,
          marginVertical: 8,
        },
      }}
    />
  );
}

export function ReflexaoReader({ reflexao }: { reflexao: Lida }) {
  return (
    <View>
      {/* Cabecalho: referencia biblica em serifada, como na web. */}
      <Text variant="overline" color={scheme.textMuted} style={{ textTransform: 'uppercase' }}>
        {reflexao.version}
      </Text>
      <Text variant="display" display weight="bold" style={{ marginTop: 4 }}>
        {reflexao.scripture_reference}
      </Text>
      <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 6 }}>
        {formatLongPT(reflexao.publishAt)}
      </Text>

      {/* O texto biblico e destaque, nao uma das etapas numeradas. */}
      <View
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: radius.lg,
          backgroundColor: scheme.accentSubtle,
        }}
      >
        <Text variant="body" display style={{ fontSize: 20, lineHeight: 30 }}>
          {reflexao.bible_text}
        </Text>
      </View>

      {/* As cinco etapas da exegese, numeradas como em TextReader.svelte. */}
      {REFLECTION_SECTIONS.map((secao, i) => {
        const conteudo = reflexao[secao.key];
        if (!conteudo) return null;

        return (
          <View key={secao.key} style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.pill,
                  backgroundColor: scheme.accentSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="caption" weight="bold" color={scheme.accent}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="title" display weight="bold">
                {secao.title}
              </Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <SecaoMarkdown texto={conteudo} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
