import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EndMark, SectionNumeral } from '../src/components/ornaments';
import { GoldRule, Overline, Text, scheme } from '../src/components/ui';
import { space } from '../src/theme/tokens';

/**
 * Politica de privacidade.
 *
 * Precisa ser alcancavel SEM sessao (por isso fica fora do guard): a App
 * Review abre esta tela, e o link tambem aparece no paywall, onde e exigencia
 * da diretriz 3.1.2.
 *
 * O conteudo e o mesmo de front_fide/src/routes/policies/+page.svelte, palavra
 * por palavra: divergir entre app e web numa politica de privacidade e um
 * problema juridico, nao de conteudo. O que muda e so a forma — as sete secoes
 * numeradas seguem a mesma gramatica visual do leitor de reflexoes.
 */

const CONTATO = 'contato@mais-verbum.com';

interface Secao {
  titulo: string;
  paragrafos?: string[];
  /** Itens com termo em destaque, como os `<li><span class="font-bold">` da web. */
  itens?: { termo: string; texto: string }[];
}

const SECOES: Secao[] = [
  {
    titulo: 'Introdução',
    paragrafos: [
      'Bem-vindo ao feith! A sua privacidade é de extrema importância para nós. Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos nossos usuários. Ao usar o aplicativo feith, você concorda com a coleta e uso de informações de acordo com esta política.',
    ],
  },
  {
    titulo: 'Informações que coletamos',
    paragrafos: ['Para fornecer nossos serviços, podemos coletar as seguintes informações:'],
    itens: [
      {
        termo: 'Informações de uso',
        texto:
          'Dados sobre sua interação com o aplicativo, como tempo de estudo, estudos favoritos, anotações e histórico de leitura. Essas informações são usadas para personalizar sua experiência e sincronizar seus dados entre dispositivos.',
      },
      {
        termo: 'Informações do dispositivo',
        texto:
          'Detalhes sobre o dispositivo que você usa, como modelo, sistema operacional e identificadores únicos, para garantir a compatibilidade e a segurança do serviço.',
      },
    ],
  },
  {
    titulo: 'Como usamos as informações',
    paragrafos: ['As informações coletadas são utilizadas para os seguintes propósitos:'],
    itens: [
      {
        termo: 'Oferecer e manter o serviço',
        texto: 'Para que você possa acessar seus estudos diários, anotações e favoritos.',
      },
      {
        termo: 'Personalizar sua experiência',
        texto: 'Para sugerir conteúdo e horários de estudo que se alinhem com seus hábitos.',
      },
      {
        termo: 'Melhorar o aplicativo',
        texto: 'Para analisar o uso e desenvolver novos recursos e melhorias.',
      },
    ],
  },
  {
    titulo: 'Segurança dos dados',
    paragrafos: [
      'Nós nos esforçamos para usar meios comercialmente aceitáveis para proteger suas informações. No entanto, lembre-se que nenhum método de transmissão pela internet ou armazenamento eletrônico é 100% seguro.',
    ],
  },
  {
    titulo: 'Não compartilhamento de dados com terceiros',
    paragrafos: [
      'A sua confiança é fundamental para nós. O feith não vende, aluga ou compartilha suas informações pessoais com terceiros para fins comerciais. Seus dados são usados exclusivamente para os propósitos descritos nesta política, como aprimorar sua experiência de estudo dentro do aplicativo.',
    ],
  },
  {
    titulo: 'Alterações nesta política',
    paragrafos: [
      'Podemos atualizar nossa Política de Privacidade de tempos em tempos. Notificaremos você sobre quaisquer alterações publicando a nova política nesta página. As alterações são efetivas imediatamente após a publicação.',
    ],
  },
  {
    titulo: 'Contato',
    paragrafos: ['Se você tiver alguma dúvida sobre esta política, entre em contato conosco:'],
  },
];

export default function Politicas() {
  const ano = new Date().getFullYear();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.section }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', paddingTop: space.lg }}>
          <Overline>feith</Overline>
          <Text
            variant="display"
            accessibilityRole="header"
            style={{ textAlign: 'center', marginTop: space.md }}
          >
            Política de Privacidade
          </Text>
          <GoldRule width={64} style={{ marginTop: space.xl }} />
        </View>

        {SECOES.map((secao, i) => (
          <View key={secao.titulo} style={{ marginTop: space.section }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <SectionNumeral n={i + 1} size={30} />
              <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
                {secao.titulo}
              </Text>
            </View>

            <GoldRule align="left" width={36} style={{ marginTop: space.lg }} />

            {secao.paragrafos?.map((p) => (
              <Text
                key={p.slice(0, 24)}
                variant="bodySm"
                color={scheme.textSecondary}
                style={{ marginTop: space.lg }}
              >
                {p}
              </Text>
            ))}

            {secao.itens?.map((item) => (
              <View key={item.termo} style={{ flexDirection: 'row', gap: 12, marginTop: space.lg }}>
                <Text variant="caption" color={scheme.goldSoft} style={{ lineHeight: 24 }}>
                  ◆
                </Text>
                <Text variant="bodySm" color={scheme.textSecondary} style={{ flex: 1 }}>
                  <Text variant="bodySm" font="bodySemi" color={scheme.textPrimary}>
                    {item.termo}:{' '}
                  </Text>
                  {item.texto}
                </Text>
              </View>
            ))}

            {secao.titulo === 'Contato' ? (
              <Text
                variant="bodySm"
                font="bodyMedium"
                color={scheme.accent}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(`mailto:${CONTATO}`)}
                style={{ marginTop: space.md, textDecorationLine: 'underline' }}
              >
                {CONTATO}
              </Text>
            ) : null}
          </View>
        ))}

        <EndMark />

        <Text variant="micro" color={scheme.textGhost} style={{ textAlign: 'center' }}>
          © {ano} feith. Todos os direitos reservados.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
