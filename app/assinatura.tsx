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
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/auth/AuthContext';
import { Button, Overline, Text } from '../src/components/ui';
import { posthog } from '../src/config/posthog';
import { agendarAvisoDoTeste, avisoDoTestePossivel } from '../src/iap/avisoTeste';
import { fraseDoLembrete, origemDe, precoPorMes, tituloDaOrigem } from '../src/iap/guiaAssinatura';
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
  { id: 'annual', nome: 'Anual', destaque: '7 dias grátis' },
  { id: 'annual_family', nome: 'Anual Família', destaque: 'Até 6 pessoas · 7 dias grátis' },
  { id: 'monthly', nome: 'Mensal', destaque: 'Sem período grátis' },
];

const PLANOS_DISPONIVEIS =
  Platform.OS === 'android' ? PLANOS.filter((p) => p.id !== 'annual_family') : PLANOS;

function BeneficioItem({ icone, titulo }: { icone: keyof typeof Ionicons.glyphMap; titulo: string }) {
  const { scheme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icone} size={18} color={scheme.gold} />
      <Text variant="bodySm" font="bodyMedium" style={{ flex: 1 }}>
        {titulo}
      </Text>
    </View>
  );
}

function PassoTeste({ titulo, texto, linha }: { titulo: string; texto: string; linha?: boolean }) {
  const { scheme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 11 }}>
        <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: scheme.goldSoft }} />
        {linha ? <View style={{ flex: 1, height: 1, backgroundColor: scheme.goldSoft }} /> : null}
      </View>
      <Text variant="micro" font="bodySemi" style={{ marginTop: 5 }}>
        {titulo}
      </Text>
      <Text variant="micro" color={scheme.textSecondary} style={{ paddingRight: 6 }}>
        {texto}
      </Text>
    </View>
  );
}

interface CartaoPlanoProps {
  nome: string;
  preco: string;
  periodo: string;
  destaque?: string;
  detalhePreco?: string | null;
  selecionado: boolean;
  onPress: () => void;
}

function CartaoPlano({ nome, preco, periodo, destaque, detalhePreco, selecionado, onPress }: CartaoPlanoProps) {
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selecionado }}
      accessibilityLabel={`Plano ${nome}, ${preco} por ${periodo}`}
    >
      {({ pressed }) => (
        <View style={[estilos.cartaoPlano, selecionado && estilos.cartaoPlanoSelecionado, pressed && { opacity: 0.85 }]}>
          <View style={[estilos.radio, selecionado && { borderColor: scheme.accent }]}>
            {selecionado ? <View style={estilos.radioMiolo} /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodySm" font="bodySemi">
              {nome}
            </Text>
            {destaque ? (
              <Text variant="micro" font="bodySemi" color={scheme.gold} style={{ marginTop: 1 }}>
                {destaque}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="bodySm" font="bodySemi" style={{ fontSize: 16 }}>
              {`${preco}/${periodo}`}
            </Text>
            {detalhePreco ? (
              <Text variant="micro" color={scheme.textMuted} style={{ marginTop: 1 }}>
                {detalhePreco}
              </Text>
            ) : null}
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
  const planoComprado = useRef<PlanoId | null>(null);
  const [avisoNoDia5, setAvisoNoDia5] = useState(true);

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
    void avisoDoTestePossivel().then(setAvisoNoDia5);
  }, []);

  useEffect(() => {
    if (isSupporter) {
      if (planoComprado.current && planoComprado.current !== 'monthly') void agendarAvisoDoTeste();
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
    planoComprado.current = planoSelecionado;
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
        {origem === 'lembrete' && dias !== null ? (
          <Text variant="bodySm" font="bodySemi" color={scheme.accent} style={{ marginBottom: space.sm }}>
            {fraseDoLembrete(summary?.streak ?? 0, dias)}
          </Text>
        ) : null}
        {origem === 'anotacao' ? (
          <Text variant="bodySm" font="bodySemi" color={scheme.accent} style={{ marginBottom: space.sm }}>
            Você já escreveu 6 anotações.
          </Text>
        ) : null}
        {origem === 'favorito' ? (
          <Text variant="bodySm" font="bodySemi" color={scheme.accent} style={{ marginBottom: space.sm }}>
            Você já guardou 6 favoritos.
          </Text>
        ) : null}

        <Text variant="display" accessibilityRole="header" style={{ paddingRight: 36 }}>
          {tituloDaOrigem(origem)}
        </Text>
        <Text color={scheme.textSecondary} style={{ fontSize: 15, lineHeight: 22, marginTop: 6 }}>
          A leitura em texto continua grátis, sempre.
        </Text>

        <View style={{ gap: 10, marginTop: space.lg }}>
          <BeneficioItem icone="headset" titulo="Áudio narrado de todas as reflexões" />
          <BeneficioItem icone="trail-sign" titulo="Todas as trilhas, incluindo Duas Vozes" />
          <BeneficioItem icone="library" titulo="Acervo completo e notas sem limite" />
        </View>

        <View style={{ gap: 10, marginTop: space.lg }} accessibilityRole="radiogroup">
          {PLANOS_DISPONIVEIS.map((plano) => {
            const preco = produtos?.[plano.id]?.displayPrice ?? PRECOS_PADRAO[plano.id];
            return (
              <CartaoPlano
                key={plano.id}
                nome={plano.nome}
                preco={preco}
                periodo={plano.id === 'monthly' ? 'mês' : 'ano'}
                destaque={plano.destaque}
                detalhePreco={plano.id === 'annual' ? precoPorMes(preco, produtos?.annual?.price) : null}
                selecionado={planoSelecionado === plano.id}
                onPress={() => setPlanoSelecionado(plano.id)}
              />
            );
          })}
        </View>

        {temTrial ? (
          <View style={estilos.calendario}>
            <Overline>Como funciona o período grátis</Overline>
            <View style={{ flexDirection: 'row', marginTop: space.sm }}>
              <PassoTeste titulo="Hoje" texto="Acesso total" linha />
              {avisoNoDia5 ? <PassoTeste titulo="Dia 5" texto="Avisamos você" linha /> : null}
              <PassoTeste titulo="Dia 7" texto="Primeira cobrança" />
            </View>
          </View>
        ) : null}

        {erro ? (
          <View style={estilos.bannerErro}>
            <Ionicons name="alert-circle-outline" size={18} color={scheme.accent} />
            <Text variant="caption" color={scheme.accent} style={{ flex: 1 }}>
              {erro}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: space.lg }}>
          <Button
            label={
              comprando
                ? `Processando na ${NOME_LOJA}...`
                : temTrial
                  ? 'Começar 7 dias grátis'
                  : `Assinar por ${precoFormatado}/${periodo}`
            }
            loading={comprando}
            disabled={comprando || restaurando || carregandoProduto}
            onPress={handleAssinar}
          />
          {convidado ? (
            <Button
              label="Continuar grátis"
              variant="ghost"
              textColor={scheme.textSecondary}
              disabled={comprando}
              onPress={() => fechar('continue_free')}
              style={{ alignSelf: 'center', marginTop: space.xs }}
            />
          ) : null}
        </View>

        {/* Termos Legais Obrigatorios pela Diretriz 3.1.2 da Apple */}
        <View style={estilos.containerLegal}>
          <Text variant="micro" color={scheme.textGhost} style={estilos.textoLegal}>
            {textoLegal}
          </Text>

          <View style={estilos.linksLegais}>
            <Pressable onPress={handleRestaurar} disabled={comprando || restaurando} hitSlop={8}>
              <Text variant="caption" font="bodyMedium" color={scheme.textSecondary}>
                {restaurando ? 'Restaurando…' : 'Restaurar compras'}
              </Text>
            </Pressable>
            <Pressable onPress={abrirTermos} hitSlop={8}>
              <Text variant="caption" font="bodyMedium" color={scheme.textSecondary}>
                Termos
              </Text>
            </Pressable>
            <Pressable onPress={abrirPrivacidade} hitSlop={8}>
              <Text variant="caption" font="bodyMedium" color={scheme.textSecondary}>
                Privacidade
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
  calendario: {
    marginTop: space.md,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: scheme.canvasWarm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: scheme.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMiolo: { width: 12, height: 12, borderRadius: 6, backgroundColor: scheme.accent },
  cartaoPlano: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 62,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.surface,
  },
  cartaoPlanoSelecionado: {
    borderWidth: 1.5,
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
    marginTop: space.md,
    gap: space.sm,
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
  });
}
