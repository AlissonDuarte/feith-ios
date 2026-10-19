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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
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
} from '../src/components/ui';
import { posthog } from '../src/config/posthog';
import { fraseDoLembrete, origemDe } from '../src/iap/guiaAssinatura';
import { useIap } from '../src/iap/IapContext';
import { diasDeUso, registrarExibicaoAssinatura } from '../src/iap/lembretesAssinatura';
import { NOME_LOJA, type PlanoId } from '../src/iap/tipos';
import { useTheme } from '../src/theme/ThemeContext';
import { radius, space, type Scheme } from '../src/theme/tokens';

const APPLE_STANDARD_EULA =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PRECOS_PADRAO: Record<PlanoId, string> = {
  monthly: 'R$ 9,90',
  annual: 'R$ 69,90',
  annual_family: 'R$ 99,90',
};

const PLANOS: { id: PlanoId; nome: string; destaque?: string }[] = [
  { id: 'monthly', nome: 'Mensal' },
  { id: 'annual', nome: 'Anual', destaque: '7 dias grátis' },
  { id: 'annual_family', nome: 'Anual Família', destaque: 'Até 6 pessoas · 7 dias grátis' },
];

interface BeneficioItemProps {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao: string;
}

function BeneficioItem({ icone, titulo, descricao }: BeneficioItemProps) {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
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

interface CartaoPlanoProps {
  nome: string;
  preco: string;
  periodo: string;
  destaque?: string;
  selecionado: boolean;
  onPress: () => void;
}

function CartaoPlano({ nome, preco, periodo, destaque, selecionado, onPress }: CartaoPlanoProps) {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={`Plano ${nome}, ${preco} por ${periodo}`}
    >
      {({ pressed }) => (
        <View
          style={[
            estilos.cartaoPlano,
            selecionado && estilos.cartaoPlanoSelecionado,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodySm" font="bodySemi" color={scheme.textPrimary}>
              {nome}
            </Text>
            {destaque ? (
              <Text variant="micro" font="bodySemi" color={scheme.gold} style={{ marginTop: 2 }}>
                {destaque}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text variant="body" font="bodySemi" color={scheme.textPrimary}>
              {preco}
            </Text>
            <Text variant="caption" color={scheme.textSecondary}>
              {' '}/{periodo}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function AssinaturaModal() {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const router = useRouter();
  const { isSupporter, summary } = useAuth();
  const params = useLocalSearchParams<{ origem?: string; marco?: string }>();
  const origem = origemDe(params.origem);
  const marco = typeof params.marco === 'string' ? params.marco : null;
  const convidado = origem === 'onboarding' || origem === 'lembrete';
  const [dias, setDias] = useState<number | null>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoId>('annual');
  const registrado = useRef(false);

  useEffect(() => {
    if (registrado.current) return;
    registrado.current = true;
    posthog?.capture('paywall_viewed', { source: origem, reminder: marco });
    void registrarExibicaoAssinatura(origem);
    if (origem === 'lembrete') void diasDeUso().then(setDias);
  }, [origem, marco]);

  function fechar(metodo: 'close' | 'continue_free') {
    posthog?.capture('paywall_dismissed', { source: origem, reminder: marco, method: metodo });
    router.back();
  }
  const {
    produtos,
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

  const produtoSelecionado = produtos?.[planoSelecionado] ?? null;
  const precoFormatado =
    produtoSelecionado?.displayPrice ?? PRECOS_PADRAO[planoSelecionado];
  const temTrial = planoSelecionado !== 'monthly';
  const periodo = planoSelecionado === 'monthly' ? 'mês' : 'ano';
  const inicioCobranca = temTrial
    ? `Após 7 dias de teste gratuito, o pagamento de ${precoFormatado} será cobrado`
    : `O pagamento de ${precoFormatado} será cobrado`;
  const clausulaFamilia =
    planoSelecionado === 'annual_family'
      ? ' Válida para até 6 membros da família via Compartilhamento Familiar.'
      : '';
  const textoLegal =
    Platform.OS === 'android'
      ? `${inicioCobranca} na sua conta Google Play${temTrial ? ', a menos que você cancele antes' : ' após a confirmação'}. A assinatura é renovada automaticamente a cada ${periodo} até ser cancelada. Você pode gerenciar ou cancelar sua assinatura a qualquer momento em Pagamentos e assinaturas, na Play Store.${clausulaFamilia}`
      : `${inicioCobranca} na sua conta do ID Apple${temTrial ? ', a menos que você cancele antes' : ' após a confirmação'}. A assinatura é renovada automaticamente a cada ${periodo}, exceto se cancelada pelo menos 24 horas antes do encerramento do ciclo vigente. Você pode gerenciar ou cancelar sua assinatura a qualquer momento nos Ajustes do seu iPhone.${clausulaFamilia}`;

  async function handleAssinar() {
    limparErro();
    await assinar(planoSelecionado, origem);
  }

  async function handleRestaurar() {
    limparErro();
    await restaurar();
  }

  function abrirTermos() {
    // A EULA padrao da Apple so vale para compras na App Store.
    if (Platform.OS === 'android') {
      router.push('/politicas');
      return;
    }
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
          onPress={() => fechar('close')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar tela de assinatura"
        >
          {({ pressed }) => (
            <View style={[estilos.botaoFechar, pressed && estilos.botaoFecharPressed]}>
              <Ionicons name="close" size={22} color={scheme.textSecondary} />
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={estilos.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          {origem === 'lembrete' && dias !== null ? (
            <Text
              variant="bodySm"
              font="bodySemi"
              color={scheme.accent}
              style={{ textAlign: 'center', marginBottom: space.md }}
            >
              {fraseDoLembrete(summary?.streak ?? 0, dias)}
            </Text>
          ) : null}
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

        {/* Seletor de plano */}
        <View style={{ gap: space.sm, marginBottom: space.lg }}>
          {PLANOS.map((plano) => (
            <CartaoPlano
              key={plano.id}
              nome={plano.nome}
              preco={produtos?.[plano.id]?.displayPrice ?? PRECOS_PADRAO[plano.id]}
              periodo={plano.id === 'monthly' ? 'mês' : 'ano'}
              destaque={plano.destaque}
              selecionado={planoSelecionado === plano.id}
              onPress={() => setPlanoSelecionado(plano.id)}
            />
          ))}
        </View>

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
                  / {periodo}
                </Text>
              </>
            )}
          </View>
          <Text variant="caption" color={scheme.textGhost} style={{ textAlign: 'center', marginTop: 4 }}>
            {temTrial
              ? `7 dias grátis, depois ${precoFormatado}/${periodo} • Cancele quando quiser`
              : 'Renovação mensal automática • Cancele quando quiser'}
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
            label={
              comprando
                ? `Processando na ${NOME_LOJA}...`
                : temTrial
                  ? 'Experimentar 7 dias grátis'
                  : `Assinar por ${precoFormatado}/${periodo}`
            }
            variant="quiet"
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

          {convidado ? (
            <Button
              label="Continuar grátis"
              variant="ghost"
              textColor={scheme.textSecondary}
              disabled={comprando}
              onPress={() => fechar('continue_free')}
              style={{ alignSelf: 'center' }}
            />
          ) : null}
        </View>

        {/* Termos Legais Obrigatorios pela Diretriz 3.1.2 da Apple */}
        <View style={estilos.containerLegal}>
          <Text variant="micro" color={scheme.textGhost} style={estilos.textoLegal}>
            {textoLegal}
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

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
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
  cartaoPlano: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.surface,
  },
  cartaoPlanoSelecionado: {
    borderColor: scheme.accent,
    backgroundColor: scheme.canvasWarm,
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
}
