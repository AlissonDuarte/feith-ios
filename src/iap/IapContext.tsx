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
import {
  ErrorCode,
  purchaseErrorListener,
  purchaseUpdatedListener,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';

import { mensagemDe } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import {
  abrirGerenciadorAssinaturas,
  buscarProdutoAssinatura,
  conectarStoreKit,
  desconectarStoreKit,
  restaurarCompras,
  solicitarAssinatura,
  validarEFinalizarTransacao,
} from './iapService';
import type { ProdutoAssinatura } from './tipos';

interface IapContextValue {
  produto: ProdutoAssinatura | null;
  carregandoProduto: boolean;
  comprando: boolean;
  restaurando: boolean;
  erro: string | null;
  assinar: () => Promise<boolean>;
  restaurar: () => Promise<boolean>;
  gerenciar: () => Promise<void>;
  limparErro: () => void;
}

const IapContext = createContext<IapContextValue | null>(null);

export function IapProvider({ children }: { children: React.ReactNode }) {
  const { isSupporter, refreshSummary } = useAuth();
  const [produto, setProduto] = useState<ProdutoAssinatura | null>(null);
  const [carregandoProduto, setCarregandoProduto] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Evita re-processamento concorrente da mesma transacao
  const transacoesEmProcessamento = useRef<Set<string>>(new Set());

  // Carrega informacoes do produto na inicializacao
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregandoProduto(true);
      try {
        const info = await buscarProdutoAssinatura();
        if (ativo) {
          setProduto(info);
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
      if (transacoesEmProcessamento.current.has(idTransacao)) {
        return;
      }
      transacoesEmProcessamento.current.add(idTransacao);

      try {
        setComprando(true);
        setErro(null);

        await validarEFinalizarTransacao(purchase);
        await refreshSummary();
      } catch (e) {
        console.warn('[IAP] Erro ao validar transacao:', e);
        setErro(mensagemDe(e) || 'Não foi possível confirmar sua assinatura com o servidor.');
      } finally {
        transacoesEmProcessamento.current.delete(idTransacao);
        setComprando(false);
      }
    },
    [refreshSummary],
  );

  // Registra listeners globais do StoreKit
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    void conectarStoreKit();

    const subAtualizacao = purchaseUpdatedListener((purchase: Purchase) => {
      void processarTransacao(purchase);
    });

    const subErro = purchaseErrorListener((error: PurchaseError) => {
      setComprando(false);
      // Usuario cancelou no modal nativo da Apple: comportamento normal, nao expor erro
      if (error.code === ErrorCode.UserCancelled) {
        return;
      }

      console.warn('[IAP] Erro no fluxo do StoreKit:', error);
      setErro('A compra não foi concluída. Tente novamente.');
    });

    return () => {
      subAtualizacao.remove();
      subErro.remove();
      void desconectarStoreKit();
    };
  }, [processarTransacao]);

  const assinar = useCallback(async (): Promise<boolean> => {
    if (isSupporter) {
      Alert.alert('Você já é Apoiador!', 'Sua assinatura já está ativa em sua conta.');
      return true;
    }

    try {
      setComprando(true);
      setErro(null);
      await solicitarAssinatura();
      return true;
    } catch (e: unknown) {
      setComprando(false);
      const err = e as { code?: string };
      if (
        err.code === ErrorCode.UserCancelled ||
        err.code === 'user-cancelled' ||
        err.code === 'E_USER_CANCELLED'
      ) {
        return false;
      }
      const msg = mensagemDe(e) || 'Não foi possível iniciar a assinatura na App Store.';
      setErro(msg);
      return false;
    }
  }, [isSupporter]);

  const restaurar = useCallback(async (): Promise<boolean> => {
    try {
      setRestaurando(true);
      setErro(null);

      const recuperou = await restaurarCompras();
      if (recuperou) {
        await refreshSummary();
        Alert.alert('Sucesso', 'Sua assinatura foi restaurada com sucesso!');
        return true;
      } else {
        Alert.alert(
          'Nenhuma assinatura encontrada',
          'Não encontramos uma assinatura ativa para esta conta da App Store.',
        );
        return false;
      }
    } catch (e) {
      const msg = mensagemDe(e) || 'Não foi possível restaurar suas compras.';
      setErro(msg);
      Alert.alert('Erro ao restaurar', msg);
      return false;
    } finally {
      setRestaurando(false);
    }
  }, [refreshSummary]);

  const gerenciar = useCallback(async (): Promise<void> => {
    await abrirGerenciadorAssinaturas();
  }, []);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

  const value = {
    produto,
    carregandoProduto,
    comprando,
    restaurando,
    erro,
    assinar,
    restaurar,
    gerenciar,
    limparErro,
  };

  return <IapContext.Provider value={value}>{children}</IapContext.Provider>;
}

export function useIap(): IapContextValue {
  const context = useContext(IapContext);
  if (!context) {
    throw new Error('useIap deve ser utilizado dentro de um IapProvider');
  }
  return context;
}
