/**
 * Contexto de Compras no App / Assinatura StoreKit.
 *
 * Centraliza o ciclo de vida da assinatura, escuta eventos nativos de compra
 * da Apple, valida as transacoes no backend e atualiza o estado de sessao.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';
import {
  ErrorCode,
  getAvailablePurchases,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

import { mensagemDe } from '../api/errors';
import { metaSdkAvailable } from '../ads/metaSdk';
import { useAuth } from '../auth/AuthContext';
import { posthog, posthogLog } from '../config/posthog';
import {
  abrirGerenciadorAssinaturas,
  buscarProdutosAssinatura,
  conectarStoreKit,
  desconectarStoreKit,
  restaurarCompras,
  solicitarAssinatura,
  validarEFinalizarTransacao,
} from './iapService';
import { NOME_LOJA, PLANO_POR_SKU, type PlanoId, type ProdutoAssinatura } from './tipos';

interface IapContextValue {
  produtos: Record<PlanoId, ProdutoAssinatura> | null;
  carregandoProduto: boolean;
  comprando: boolean;
  restaurando: boolean;
  erro: string | null;
  assinar: (plano: PlanoId, origem?: string) => Promise<boolean>;
  restaurar: () => Promise<boolean>;
  gerenciar: () => Promise<void>;
  limparErro: () => void;
}

const IapContext = createContext<IapContextValue | null>(null);

export function IapProvider({ children }: { children: React.ReactNode }) {
  const { isSupporter, refreshSummary } = useAuth();
  const [produtos, setProdutos] = useState<Record<PlanoId, ProdutoAssinatura> | null>(null);
  const [carregandoProduto, setCarregandoProduto] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Evita re-processamento concorrente da mesma transacao
  const transacoesEmProcessamento = useRef<Set<string>>(new Set());
  // Evita reprocessar uma transacao ja validada com sucesso: o listener nativo
  // (dedupeTransactionIOS: false) e a checagem proativa em `assinar` podem
  // entregar a mesma compra mais de uma vez em sequencia, nao so concorrente.
  const transacoesConcluidas = useRef<Set<string>>(new Set());

  const planoCompraRef = useRef<PlanoId | null>(null);
  const origemRef = useRef<string | undefined>(undefined);
  const propriedadesCompra = useCallback(
    (productId?: string) => {
      const plano = (productId && PLANO_POR_SKU[productId]) || planoCompraRef.current;
      const p = plano ? produtos?.[plano] : null;
      return {
        source: origemRef.current ?? null,
        plan: p?.id ?? productId ?? null,
        price: p?.price ?? null,
        currency: p?.currency ?? null,
      };
    },
    [produtos],
  );

  // Carrega informacoes dos tres planos na inicializacao
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregandoProduto(true);
      try {
        const info = await buscarProdutosAssinatura();
        if (ativo) {
          setProdutos(info);
        }
      } catch (err) {
        console.warn('[IAP] Erro ao carregar informacoes da assinatura:', err);
      } finally {
        if (ativo) setCarregandoProduto(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  // Processa uma transacao (compra nova, restauracao ou pendente)
  const processarTransacao = useCallback(
    async (purchase: Purchase) => {
      const idTransacao = purchase.id || purchase.transactionId || 'desconhecida';
      if (
        transacoesEmProcessamento.current.has(idTransacao) ||
        transacoesConcluidas.current.has(idTransacao)
      ) {
        return;
      }
      transacoesEmProcessamento.current.add(idTransacao);

      try {
        setComprando(true);
        setErro(null);

        await validarEFinalizarTransacao(purchase);
        transacoesConcluidas.current.add(idTransacao);
        await refreshSummary();
        const infoCompra = propriedadesCompra(purchase.productId);
        if (metaSdkAvailable && infoCompra.price != null && infoCompra.currency) {
          AppEventsLogger.logPurchase(infoCompra.price, infoCompra.currency, {
            plan: infoCompra.plan ?? '',
          });
        }
        posthog?.capture('subscription_purchase_completed', infoCompra);
        posthogLog.info('subscription purchase completed', { result: 'validated' });
      } catch (e) {
        console.warn('[IAP] Erro ao validar transacao:', e);
        posthog?.capture('subscription_purchase_failed', {
          stage: 'validation',
          ...propriedadesCompra(purchase.productId),
        });
        setErro(mensagemDe(e) || 'Não foi possível confirmar sua assinatura com o servidor.');
      } finally {
        transacoesEmProcessamento.current.delete(idTransacao);
        setComprando(false);
      }
    },
    [refreshSummary, propriedadesCompra],
  );

  // O cancelamento pode chegar pelos dois caminhos (rejeicao do request e
  // purchaseErrorListener); sem a janela, um cancelamento contaria duas vezes.
  const ultimoCancelamento = useRef(0);
  const registrarCancelamento = useCallback(() => {
    if (Date.now() - ultimoCancelamento.current < 3000) return;
    ultimoCancelamento.current = Date.now();
    posthog?.capture('subscription_purchase_cancelled', propriedadesCompra());
  }, [propriedadesCompra]);

  const processarTransacaoRef = useRef(processarTransacao);
  useEffect(() => {
    processarTransacaoRef.current = processarTransacao;
  }, [processarTransacao]);

  // Registra listeners globais da loja apenas uma vez no ciclo de vida
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    void conectarStoreKit().then(async (conectado) => {
      if (!conectado) return;

      if (Platform.OS === 'android') {
        // O StoreKit reentrega pelo listener as transacoes nao finalizadas; o
        // Play Billing nao. Uma compra paga cujo verify falhou (rede caiu)
        // ficaria sem acknowledge e o Google estornaria em 3 dias — entao
        // reprocessa aqui.
        try {
          const compras = await getAvailablePurchases();
          const pendentes = compras?.filter(
            (c) =>
              c.productId in PLANO_POR_SKU &&
              c.purchaseState === 'purchased' &&
              'isAcknowledgedAndroid' in c &&
              c.isAcknowledgedAndroid === false,
          );
          for (const compra of pendentes ?? []) {
            await processarTransacaoRef.current(compra);
          }
        } catch (e) {
          console.warn('[IAP] Falha ao recuperar compras sem acknowledge:', e);
        }
        return;
      }

      if (Platform.OS === 'ios') {
        // Entitlements que o StoreKit 2 ja entrega localmente sem precisar
        // de uma compra feita por esta conta — e o caso do Plano Família:
        // um familiar nunca "compra" nada, so recebe a transacao do titular
        // via Compartilhamento Familiar. Sem este passo, a pessoa so seria
        // reconhecida como Apoiador se achasse e tocasse "Restaurar compras"
        // manualmente na tela de assinatura.
        try {
          const compras = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
          const doFeith = compras?.filter((c) => c.productId in PLANO_POR_SKU);
          for (const compra of doFeith ?? []) {
            await processarTransacaoRef.current(compra);
          }
        } catch (e) {
          console.warn('[IAP] Falha ao verificar entitlements existentes (iOS):', e);
        }
      }
    });

    const subAtualizacao = purchaseUpdatedListener(
      (purchase: Purchase) => {
        void processarTransacaoRef.current(purchase);
      },
      { dedupeTransactionIOS: false },
    );

    const subErro = purchaseErrorListener((error: PurchaseError) => {
      setComprando(false);
      // Usuario cancelou no modal nativo da Apple: comportamento normal, nao expor erro
      if (error.code === ErrorCode.UserCancelled) {
        registrarCancelamento();
        return;
      }

      console.warn('[IAP] Erro no fluxo do StoreKit:', error);
      posthog?.capture('subscription_purchase_failed', {
        stage: 'store',
        error_code: String(error.code),
        error_message: error.message,
        platform: Platform.OS,
        ...propriedadesCompra(),
      });
      setErro('A compra não foi concluída. Tente novamente.');
    });

    return () => {
      subAtualizacao.remove();
      subErro.remove();
      void desconectarStoreKit();
    };
  }, []);

  const assinar = useCallback(async (plano: PlanoId, origem?: string): Promise<boolean> => {
    if (isSupporter) {
      Alert.alert('Você já é Apoiador!', 'Sua assinatura já está ativa em sua conta.');
      return true;
    }

    origemRef.current = origem;
    planoCompraRef.current = plano;
    const sku = produtos?.[plano]?.id;
    try {
      setComprando(true);
      setErro(null);
      posthog?.capture('subscription_purchase_started', propriedadesCompra());

      // Trava de seguranca para liberar o botao caso o iOS nao dispare callbacks
      const timerSeguranca = setTimeout(() => {
        setComprando(false);
      }, 20000);

      await solicitarAssinatura(plano);

      // Contingencia proativa: assim que o modal da Apple fecha com sucesso,
      // busca transacoes ativas caso o listener nativo demore
      setTimeout(async () => {
        try {
          const compras = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
          const compraFeith = compras?.find((c) => c.productId === sku);
          if (compraFeith) {
            await processarTransacao(compraFeith);
          }
        } catch (e) {
          console.warn('[IAP] Checagem ativa pos-compra:', e);
        } finally {
          clearTimeout(timerSeguranca);
        }
      }, 1500);

      return true;
    } catch (e: unknown) {
      setComprando(false);
      const err = e as { code?: string };
      if (
        err.code === ErrorCode.UserCancelled ||
        err.code === 'user-cancelled' ||
        err.code === 'E_USER_CANCELLED'
      ) {
        registrarCancelamento();
        return false;
      }
      posthog?.capture('subscription_purchase_failed', {
        stage: 'request',
        error_code: err.code ?? 'unknown',
        ...propriedadesCompra(),
      });
      const msg = mensagemDe(e) || `Não foi possível iniciar a assinatura na ${NOME_LOJA}.`;
      setErro(msg);
      return false;
    }
  }, [isSupporter, produtos, processarTransacao, registrarCancelamento, propriedadesCompra]);

  const restaurar = useCallback(async (): Promise<boolean> => {
    try {
      setRestaurando(true);
      setErro(null);

      const recuperou = await restaurarCompras();
      if (recuperou) {
        await refreshSummary();
        posthog?.capture('subscription_restored');
        Alert.alert('Sucesso', 'Sua assinatura foi restaurada com sucesso!');
        return true;
      } else {
        Alert.alert(
          'Nenhuma assinatura ativa',
          Platform.OS === 'android'
            ? 'Não encontramos uma assinatura de Apoiador ativa vinculada a esta conta Google.'
            : 'Não encontramos uma assinatura de Apoiador ativa vinculada a este ID Apple.',
        );
        return false;
      }
    } catch (e) {
      const msg = mensagemDe(e) || 'Não foi possível restaurar suas compras no momento.';
      setErro(msg);
      return false;
    } finally {
      setRestaurando(false);
    }
  }, [refreshSummary]);

  const gerenciar = useCallback(async (): Promise<void> => {
    posthog?.capture('subscription_manage_opened');
    try {
      await abrirGerenciadorAssinaturas();
    } catch (e) {
      console.warn('[IAP] Falha ao abrir gerenciador de assinaturas:', e);
    }
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  return (
    <IapContext.Provider
      value={{
        produtos,
        carregandoProduto,
        comprando,
        restaurando,
        erro,
        assinar,
        restaurar,
        gerenciar,
        limparErro,
      }}
    >
      {children}
    </IapContext.Provider>
  );
}

export function useIap(): IapContextValue {
  const context = useContext(IapContext);
  if (!context) {
    throw new Error('useIap deve ser utilizado dentro de um IapProvider');
  }
  return context;
}
