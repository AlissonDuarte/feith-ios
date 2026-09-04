import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, useWindowDimensions, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { Button, Text, scheme } from '../src/components/ui';
import { radius } from '../src/theme/tokens';

/**
 * Onboarding em tela cheia.
 *
 * Porte de modals/OnboardingModal.svelte — mesmo texto, mesmos quatro passos.
 * Duas diferencas:
 *
 * 1. Tela cheia com paginacao horizontal, e nao um modal com botoes de avancar.
 *    Deslizar e o gesto natural de um carrossel no iPhone.
 * 2. O gatilho e `onboarding_completed` do servidor, e nao o localStorage que a
 *    web usa (home/+page.svelte:195). Assim quem troca de aparelho nao ve o
 *    onboarding de novo, e quem limpa os dados do app tambem nao.
 */

interface Passo {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  corpo: string;
  itens?: { rotulo: string; desc: string }[];
  detalhe: string;
}

const PASSOS: Passo[] = [
  {
    icone: 'book-outline',
    titulo: 'Bem-vindo ao feith',
    corpo:
      'Uma exegese bíblica aprofundada, todo dia. Sem ruído, sem sensacionalismo — apenas o texto e o que ele significa de fato.',
    detalhe:
      'O feith foi construído para quem leva a fé a sério e quer entender as Escrituras com rigor histórico e teológico.',
  },
  {
    icone: 'layers-outline',
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
    icone: 'create-outline',
    titulo: 'Capture seus pensamentos',
    corpo:
      'Registre insights, perguntas e conexões enquanto lê. Suas anotações ficam salvas e organizadas por reflexão.',
    detalhe: 'O botão no canto da tela de leitura abre o editor a qualquer momento.',
  },
  {
    icone: 'flame-outline',
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
      <FlatList
        ref={listaRef}
        data={PASSOS}
        keyExtractor={(p) => p.titulo}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={aoVerItens}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={{ width, paddingHorizontal: 32, justifyContent: 'center', flex: 1 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: scheme.accentSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icone} size={32} color={scheme.accent} />
            </View>

            <Text variant="display" display weight="bold" style={{ marginTop: 28 }}>
              {item.titulo}
            </Text>

            <Text variant="body" color={scheme.textSecondary} style={{ marginTop: 14 }}>
              {item.corpo}
            </Text>

            {item.itens?.map((i) => (
              <View key={i.rotulo} style={{ flexDirection: 'row', marginTop: 14 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: scheme.accent,
                    marginTop: 9,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="semi">
                    {i.rotulo}
                  </Text>
                  <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 2 }}>
                    {i.desc}
                  </Text>
                </View>
              </View>
            ))}

            <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 24 }}>
              {item.detalhe}
            </Text>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 32, paddingBottom: 16 }}>
        {/* Pontos de paginacao */}
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}
        >
          {PASSOS.map((p, i) => (
            <View
              key={p.titulo}
              style={{
                width: i === indice ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === indice ? scheme.accent : scheme.border,
              }}
            />
          ))}
        </View>

        <Button
          label={ultimo ? 'Começar a ler' : 'Continuar'}
          onPress={avancar}
          loading={concluindo}
          disabled={concluindo}
        />
        {!ultimo ? (
          <Button
            label="Pular"
            variant="ghost"
            onPress={concluir}
            disabled={concluindo}
            style={{ marginTop: 8 }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
