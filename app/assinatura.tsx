/**
 * Tela de Assinatura / Paywall (Plano Apoiador Feith).
 *
 * Apresentada como folha modal. Atende integralmente as diretrizes 3.1.1 e 3.1.2
 * da Apple App Store:
 * 1. Nome, preco (R$ 9,90/mes) e duracao do plano claros e explicitos.
 * 2. Texto legal de renovacao automatica e instrucoes de cancelamento.
 * 3. Botao de restauracao de compras obrigatorio.
 * 4. Links diretos para Termos de Uso (EULA) e Politica de Privacidade.
 * 5. Cobranca 100% via StoreKit (sem mencoes a pagamentos externos).
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/auth/AuthContext';
import { AccentHalo } from '../src/components/ornaments';
import {
  Button,
  Card,
  GoldRule,
  Overline,
  Text,
  scheme,
} from '../src/components/ui';
import { useIap } from '../src/iap/IapContext';
import { radius, space } from '../src/theme/tokens';

const APPLE_STANDARD_EULA =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

interface BeneficioItemProps {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
}

function BeneficioItem({ icone, titulo, descricao }: BeneficioItemProps) {
  return (
    <View style={estilos.beneficioRow}>
      <View style={estilos.iconeContainer}>
        <Ionicons name={icone} size={20} color={scheme.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySm" font="bodySemi" color={scheme.textPrimary}>
          {titulo}
        </Text>
        <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 2 }}>
          {descricao}
        </Text>
      </View>
    </View>
  );
}

export default function AssinaturaModal() {
  const router = useRouter();
  const { isSupporter } = useAuth();
  const {
    produto,
    carregandoProduto,
    comprando,
    restaurando,
    erro,
    assinar,
    restaurar,
    limparErro,
  } = useIap();

  // Fecha o modal caso o usuario ja seja ou acabe de virar apoiador
  useEffect(() => {
    if (isSupporter) {
      router.back();
    }
  }, [isSupporter, router]);

  const precoFormatado = produto?.displayPrice ?? 'R$ 9,90';

  async function handleAssinar() {
    limparErro();
    await assinar();
  }

  async function handleRestaurar() {
    limparErro();
    await restaurar();
  }

  function abrirTermos() {
    void Linking.openURL(APPLE_STANDARD_EULA);
  }

  function abrirPrivacidade() {
    router.push('/politicas');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top', 'bottom']}>
      <AccentHalo height={360} opacity={0.6} />

      {/* Barra de Fechar */}
      <View style={estilos.headerModal}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar tela de assinatura"
          style={({ pressed }) => [estilos.botaoFechar, pressed && estilos.botaoFecharPressed]}
        >
          <Ionicons name="close" size={22} color={scheme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={estilos.badge}>
            <Ionicons name="ribbon-outline" size={14} color={scheme.gold} />
            <Text
              variant="micro"
              font="bodySemi"
              color={scheme.gold}
              style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}
            >
              Apoiador Feith
            </Text>
          </View>

          <Text variant="display" style={estilos.tituloPrincipal}>
            Aprofunde seu momento diário com Deus.
          </Text>

          <GoldRule width={56} style={{ marginTop: space.lg, marginBottom: space.xl }} />

          <Text variant="body" color={scheme.textSecondary} style={estilos.subtitulo}>
            Torne-se um apoiador e tenha acesso ilimitado a todas as ferramentas do seu devocional diário.
          </Text>
        </View>

        {/* Beneficios */}
        <Card style={{ marginVertical: space.xl, padding: space.lg }}>
          <Overline style={{ marginBottom: space.md }}>O que você recebe</Overline>

          <BeneficioItem
            icone="headset-outline"
            titulo="Reflexões narradas em áudio"
            descricao="Ouça a reflexão e os versículos de cada dia onde estiver, no seu ritmo."
          />

          <View style={estilos.divisor} />

          <BeneficioItem
            icone="calendar-outline"
            titulo="Histórico completo do acervo"
            descricao="Acesse qualquer dia do histórico sem o limite de 30 dias do plano gratuito."
          />

          <View style={estilos.divisor} />

          <BeneficioItem
            icone="create-outline"
            titulo="Anotações e favoritos ilimitados"
            descricao="Guarde todos os seus aprendizados e reflexões sem limite mensal."
          />
        </Card>

        {/* Card do Preco */}
        <Card quiet style={estilos.cardPreco}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
            {carregandoProduto ? (
              <ActivityIndicator size="small" color={scheme.accent} />
            ) : (
              <>
                <Text variant="display" font="serifSemi" color={scheme.accent} style={{ fontSize: 36 }}>
                  {precoFormatado}
                </Text>
                <Text variant="body" color={scheme.textSecondary} style={{ marginLeft: 6 }}>
                  / mês
                </Text>
              </>
            )}
          </View>
          <Text variant="caption" color={scheme.textGhost} style={{ textAlign: 'center', marginTop: 4 }}>
            Renovação mensal automática • Cancele quando quiser
          </Text>
        </Card>

        {/* Mensagem de Erro (se houver) */}
        {erro ? (
          <View style={estilos.bannerErro}>
            <Ionicons name="alert-circle-outline" size={18} color={scheme.accent} />
            <Text variant="caption" color={scheme.accent} style={{ flex: 1 }}>
              {erro}
            </Text>
          </View>
        ) : null}

        {/* Botoes de Acao */}
        <View style={{ gap: space.md, marginTop: space.lg }}>
          <Button
            label={comprando ? 'Processando na App Store...' : `Assinar por ${precoFormatado}/mês`}
            variant="primary"
            loading={comprando}
            disabled={comprando || restaurando}
            onPress={handleAssinar}
          />

          <Button
            label="Restaurar compras"
            variant="quiet"
            loading={restaurando}
            disabled={comprando || restaurando}
            onPress={handleRestaurar}
          />
        </View>

        {/* Termos Legais Obrigatorios pela Diretriz 3.1.2 da Apple */}
        <View style={estilos.containerLegal}>
          <Text variant="micro" color={scheme.textGhost} style={estilos.textoLegal}>
            O pagamento de {precoFormatado} será cobrado na sua conta do ID Apple após a confirmação.
            A assinatura é renovada automaticamente a cada mês, exceto se cancelada pelo menos 24
            horas antes do encerramento do ciclo vigente. Você pode gerenciar ou cancelar sua
            assinatura a qualquer momento nos Ajustes do seu iPhone.
          </Text>

          <View style={estilos.linksLegais}>
            <Pressable onPress={abrirTermos} hitSlop={8}>
              <Text variant="caption" color={scheme.textSecondary} style={estilos.link}>
                Termos de Uso (EULA)
              </Text>
            </Pressable>
            <Text variant="caption" color={scheme.textGhost}>
              •
            </Text>
            <Pressable onPress={abrirPrivacidade} hitSlop={8}>
              <Text variant="caption" color={scheme.textSecondary} style={estilos.link}>
                Política de Privacidade
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  headerModal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
  },
  botaoFechar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: scheme.canvasWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoFecharPressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(139,105,20,0.25)',
    backgroundColor: 'rgba(139,105,20,0.08)',
    marginBottom: space.lg,
  },
  tituloPrincipal: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    color: scheme.textPrimary,
  },
  subtitulo: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
  },
  beneficioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  iconeContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(139,105,20,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: scheme.border,
    marginVertical: space.md,
  },
  cardPreco: {
    alignItems: 'center',
    paddingVertical: space.xl,
    backgroundColor: scheme.canvasWarm,
    borderRadius: radius.lg,
  },
  bannerErro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: space.md,
    backgroundColor: 'rgba(122,31,31,0.08)',
    borderRadius: radius.sm,
    marginVertical: space.sm,
  },
  containerLegal: {
    marginTop: space.xxl,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: scheme.border,
    gap: space.md,
  },
  textoLegal: {
    textAlign: 'center',
    lineHeight: 16,
  },
  linksLegais: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingBottom: space.lg,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
