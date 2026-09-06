import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { AccentHalo } from '../src/components/ornaments';
import { Button, GoldRule, Overline, Text, scheme } from '../src/components/ui';
import { fonts, radius, space } from '../src/theme/tokens';

/**
 * Onboarding em tela cheia.
 *
 * Porte de modals/OnboardingModal.svelte — mesmo texto, mesmos quatro passos.
 * Tres diferencas:
 *
 * 1. Tela cheia com paginacao horizontal, e nao um modal com botoes de avancar.
 *    Deslizar e o gesto natural de um carrossel no iPhone.
 * 2. O gatilho e `onboarding_completed` do servidor, e nao o localStorage que a
 *    web usa (home/+page.svelte:195). Assim quem troca de aparelho nao ve o
 *    onboarding de novo, e quem limpa os dados do app tambem nao.
 * 3. Numeral gigante em serifada no lugar do icone — o `.number-accent` da
 *    secao "Como funciona" da landing. Um icone de contorno em circulo ambar e
 *    o vocabulario de qualquer app; o numeral e o desta marca.
 */

interface Passo {
  titulo: string;
  corpo: string;
  itens?: { rotulo: string; desc: string }[];
  detalhe: string;
}

const PASSOS: Passo[] = [
  {
    titulo: 'Bem-vindo ao feith',
    corpo:
      'Uma exegese bíblica aprofundada, todo dia. Sem ruído, sem sensacionalismo — apenas o texto e o que ele significa de fato.',
    detalhe:
      'O feith foi construído para quem leva a fé a sério e quer entender as Escrituras com rigor histórico e teológico.',
  },
  {
    titulo: 'Como cada reflexão funciona',
    corpo: 'Toda reflexão diária é estruturada em três camadas de leitura:',
    itens: [
      { rotulo: 'Contexto', desc: 'Situação histórica, literária e cultural do texto' },
      { rotulo: 'Exegese', desc: 'O que o texto diz nas línguas originais' },
      { rotulo: 'Doutrina', desc: 'O que isso significa para a fé hoje' },
    ],
    detalhe: 'Leva cerca de 5–10 minutos por dia. Profundidade sem pressa.',
  },
  {
    titulo: 'Capture seus pensamentos',
    corpo:
      'Registre insights, perguntas e conexões enquanto lê. Suas anotações ficam salvas e organizadas por reflexão.',
    detalhe: 'O botão Anotar, no canto da tela de leitura, abre o editor a qualquer momento.',
  },
  {
    titulo: 'A consistência que transforma',
    corpo:
      'A leitura diária é o que separa conhecimento acumulado de transformação real.',
    detalhe:
      'Volte todos os dias. Com o tempo, você vai perceber conexões que só surgem para quem lê de forma contínua.',
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { refreshSummary } = useAuth();

  const [indice, setIndice] = useState(0);
  const [concluindo, setConcluindo] = useState(false);
  const listaRef = useRef<FlatList<Passo>>(null);

  const ultimo = indice === PASSOS.length - 1;

  const aoVerItens = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const primeiro = viewableItems[0];
    if (primeiro?.index != null) setIndice(primeiro.index);
  }).current;

  async function concluir() {
    setConcluindo(true);
    try {
      await api.completeOnboarding();
      await refreshSummary();
    } catch {
      // Falhar aqui nao pode prender a pessoa na abertura do app: ela segue
      // para a leitura, e o onboarding reaparece na proxima vez.
    } finally {
      setConcluindo(false);
      router.replace('/(tabs)/hoje');
    }
  }

  function avancar() {
    if (ultimo) return void concluir();
    listaRef.current?.scrollToIndex({ index: indice + 1, animated: true });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <AccentHalo height={420} />

      <FlatList
        ref={listaRef}
        data={PASSOS}
        keyExtractor={(p) => p.titulo}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={aoVerItens}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index }) => (
          <View style={{ width, paddingHorizontal: 32, justifyContent: 'center', flex: 1 }}>
            {/* `.number-accent` da landing: Cormorant leve, enorme, em oxblood
                quase apagado. Ele conta a posicao sem ocupar hierarquia. */}
            <Text style={estilos.numeral}>{String(index + 1).padStart(2, '0')}</Text>

            <GoldRule align="left" width={52} style={{ marginTop: space.lg }} />

            <Text variant="hero" style={{ marginTop: space.xxl }}>
              {item.titulo}
            </Text>

            <Text variant="body" color={scheme.textSecondary} style={{ marginTop: space.lg }}>
              {item.corpo}
            </Text>

            {item.itens?.map((i) => (
              <View key={i.rotulo} style={estilos.item}>
                <Text style={estilos.losango}>◆</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySm" font="bodySemi">
                    {i.rotulo}
                  </Text>
                  <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 2 }}>
                    {i.desc}
                  </Text>
                </View>
              </View>
            ))}

            <Text variant="caption" color={scheme.textGhost} style={{ marginTop: space.xxl }}>
              {item.detalhe}
            </Text>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 32, paddingBottom: space.lg }}>
        {/* Progresso como fio continuo, e nao pontos: e o mesmo fio de ouro
            que separa as secoes do app inteiro. */}
        <View style={estilos.progresso}>
          <Overline>{`Passo ${indice + 1} de ${PASSOS.length}`}</Overline>
          <View style={estilos.trilho}>
            <View
              style={[
                estilos.avanco,
                { width: `${((indice + 1) / PASSOS.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <Button
          label={ultimo ? 'Começar a ler' : 'Continuar'}
          icon="arrow-forward"
          onPress={avancar}
          loading={concluindo}
          disabled={concluindo}
        />
        {!ultimo ? (
          <Button
            label="Pular apresentação"
            variant="ghost"
            textColor={scheme.accent}
            onPress={concluir}
            disabled={concluindo}
            style={{ marginTop: space.sm, alignSelf: 'center' }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  numeral: {
    fontFamily: fonts.display,
    fontSize: 76,
    lineHeight: 80,
    color: scheme.accent,
    opacity: 0.22,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: space.lg,
  },
  losango: {
    fontFamily: fonts.body,
    fontSize: 9,
    lineHeight: 22,
    color: scheme.gold,
  },
  progresso: {
    marginBottom: space.xxl,
  },
  trilho: {
    height: 2,
    backgroundColor: scheme.border,
    marginTop: space.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  avanco: {
    height: 2,
    backgroundColor: scheme.gold,
    borderRadius: radius.pill,
  },
});
