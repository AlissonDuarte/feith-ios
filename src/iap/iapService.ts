/**
 * Servico de comunicacao nativa com a Apple StoreKit (StoreKit 2).
 *
 * Responsavel pelo ciclo de vida das compras no app:
 * 1. Inicializacao da conexao com a App Store.
 * 2. Busca de precos e metadados oficiais da assinatura.
 * 3. Abertura da folha de pagamento nativa (Touch ID / Face ID / Senha).
 * 4. Captura do JWS (JSON Web Signature) gerado pela Apple.
 * 5. Envio do JWS ao backend (POST /subscriptions/apple/verify).
 * 6. APENAS APOS O 200 DO BACKEND: chamada a finishTransaction().
 */

import { Linking, Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getTransactionJwsIOS,
  initConnection,
  requestPurchase,
  showManageSubscriptionsIOS,
  type Purchase,
} from 'react-native-iap';

import { api } from '../api/client';
import type { SubscriptionStatus } from '../api/types';
import { IAP_SKU, type ProdutoAssinatura } from './tipos';

let conexaoIniciada = false;

/**
 * Conecta com a App Store nativa com protecao contra chamadas duplicadas.
 */
export async function conectarStoreKit(): Promise<boolean> {
  if (conexaoIniciada) return true;
  try {
    const ok = await initConnection();
    conexaoIniciada = ok;
    return ok;
  } catch (err) {
    console.warn('[IAP] Falha ao inicializar conexao StoreKit:', err);
    return false;
  }
}

/**
 * Finaliza a conexao ao desmontar a aplicacao se necessario.
 */
export async function desconectarStoreKit(): Promise<void> {
  if (!conexaoIniciada) return;
  try {
    await endConnection();
  } catch {
    // Silencia erro no encerramento
  } finally {
    conexaoIniciada = false;
  }
}

/**
 * Busca informacoes atualizadas da assinatura na App Store.
 * Se a loja estiver inacessivel (ou em dev sem conexao), devolve
 * os metadados padrao para a tela nao travar.
 */
export async function buscarProdutoAssinatura(): Promise<ProdutoAssinatura> {
  const conectado = await conectarStoreKit();

  if (conectado) {
    try {
      const produtos = await fetchProducts({
        skus: [IAP_SKU],
        type: 'subs',
      });

      if (produtos && produtos.length > 0) {
        const item = produtos[0];
        return {
          id: item.id,
          title: item.title || 'Apoiador Feith',
          description:
            item.description ||
            'Acesso ao áudio diário, acervo completo e reflexões ilimitadas.',
          displayPrice: item.displayPrice || 'R$ 9,90',
          price: item.price ?? 9.9,
          currency: item.currency || 'BRL',
        };
      }
    } catch (err) {
      console.warn('[IAP] Erro ao buscar produto no StoreKit:', err);
    }
  }

  // Fallback seguro em caso de indisponibilidade de rede ou sandbox local
  return {
    id: IAP_SKU,
    title: 'Apoiador Feith',
    description: 'Acesso ao áudio diário, acervo completo e reflexões ilimitadas.',
    displayPrice: 'R$ 9,90',
    price: 9.9,
    currency: 'BRL',
  };
}

/**
 * Abre a folha nativa da Apple para o usuario assinar.
 * O resultado real do pagamento e entregue pelo purchaseUpdatedListener.
 */
export async function solicitarAssinatura(): Promise<void> {
  await conectarStoreKit();

  await requestPurchase({
    request: {
      apple: { sku: IAP_SKU },
    },
    type: 'subs',
  });
}

/**
 * Valida a transacao assinada no backend do Feith e conclui na fila da Apple.
 *
 * REGRA CRITICA: finishTransaction so pode ser executado depois do backend
 * responder 200. Se o backend falhar (ex: rede caiu), a transacao continua
 * na fila do iOS e sera reprocessada automaticamente pelo listener no boot.
 */
export async function validarEFinalizarTransacao(
  purchase: Purchase,
): Promise<SubscriptionStatus> {
  let jws = purchase.purchaseToken;

  // No StoreKit 2 no iOS, caso purchaseToken venha vazio, buscamos o JWS explicitamente
  if (!jws && Platform.OS === 'ios') {
    try {
      jws = await getTransactionJwsIOS(purchase.productId);
    } catch (err) {
      console.warn('[IAP] Falha ao obter JWS direto do StoreKit:', err);
    }
  }

  if (!jws) {
    throw new Error('Não foi possível obter o comprovante criptográfico (JWS) da Apple.');
  }

  // 1. Valida contra o backend (que confere a cadeia de certificados da Apple)
  const status = await api.verifyAppleTransaction(jws);

  // 2. Com a aprovacao confirmada no servidor, finaliza e tira da fila da Apple
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (err) {
    console.warn('[IAP] Falha ao chamar finishTransaction apos verificacao:', err);
  }

  return status;
}

/**
 * Restaura compras ativas associadas a conta da App Store do usuario.
 * Obrigatorio pelas diretrizes da App Store (Guideline 3.1.1).
 */
export async function restaurarCompras(): Promise<boolean> {
  await conectarStoreKit();

  const compras = await getAvailablePurchases({
    onlyIncludeActiveItemsIOS: true,
  });

  if (!compras || compras.length === 0) {
    return false;
  }

  // Procura transacoes associadas ao SKU do Feith
  const comprasFeith = compras.filter((c) => c.productId === IAP_SKU);
  if (comprasFeith.length === 0) {
    return false;
  }

  // Valida a transacao mais recente contra o backend
  for (const compra of comprasFeith) {
    await validarEFinalizarTransacao(compra);
  }

  return true;
}

/**
 * Abre a tela nativa do iOS para gerenciar ou cancelar a assinatura.
 */
export async function abrirGerenciadorAssinaturas(): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      await showManageSubscriptionsIOS();
      return;
    } catch {
      // Fallback para URL de assinaturas do ID Apple
    }
  }

  await Linking.openURL('https://apps.apple.com/account/subscriptions');
}
