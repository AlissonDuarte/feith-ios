/**
 * Servico de comunicacao nativa com a loja: Apple StoreKit 2 no iOS e Google
 * Play Billing no Android (os dois pelo react-native-iap).
 *
 * Responsavel pelo ciclo de vida das compras no app:
 * 1. Inicializacao da conexao com a loja.
 * 2. Busca de precos e metadados oficiais da assinatura.
 * 3. Abertura da folha de pagamento nativa.
 * 4. Captura do comprovante: JWS no iOS, purchaseToken no Android.
 * 5. Envio ao backend (POST /subscriptions/apple/verify ou /google/verify).
 * 6. APENAS APOS O 200 DO BACKEND: chamada a finishTransaction() — no Android
 *    e ela que faz o acknowledge; sem ele o Google estorna a compra em 3 dias.
 */

import { Linking, Platform } from 'react-native';
import {
  deepLinkToSubscriptions,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getTransactionJwsIOS,
  initConnection,
  requestPurchase,
  showManageSubscriptionsIOS,
  type ProductSubscription,
  type Purchase,
} from 'react-native-iap';

import { api } from '../api/client';
import type { SubscriptionStatus } from '../api/types';
import { ANDROID_PACKAGE, IAP_SKU, type ProdutoAssinatura } from './tipos';

let conexaoIniciada = false;

/**
 * No Android a compra de assinatura exige o offerToken do plano base, que so
 * vem no fetchProducts. Guardado aqui para o solicitarAssinatura nao precisar
 * buscar de novo a cada toque no botao.
 */
let offerTokenAndroid: string | null = null;

const METADADOS_PADRAO: ProdutoAssinatura = {
  id: IAP_SKU,
  title: 'Apoiador Feith',
  description: 'Acesso ao áudio diário, acervo completo e reflexões ilimitadas.',
  displayPrice: 'R$ 9,90',
  price: 9.9,
  currency: 'BRL',
};

/**
 * Conecta com a loja nativa com protecao contra chamadas duplicadas.
 */
export async function conectarStoreKit(): Promise<boolean> {
  if (conexaoIniciada) return true;
  try {
    const ok = await initConnection();
    conexaoIniciada = ok;
    return ok;
  } catch (err) {
    console.warn('[IAP] Falha ao inicializar conexao com a loja:', err);
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
 * Oferta do plano base mensal. Ofertas promocionais (teste gratis, desconto)
 * tem `id` proprio; o plano base vem sem id. Se so houver promocionais — o
 * Google so as lista para quem e elegivel —, usa a primeira.
 */
function ofertaAndroid(item: ProductSubscription) {
  const ofertas = (item.subscriptionOffers ?? []).filter((o) => o.offerTokenAndroid);
  return ofertas.find((o) => !o.id) ?? ofertas[0] ?? null;
}

/**
 * Busca informacoes atualizadas da assinatura na loja.
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
        const item = produtos[0] as ProductSubscription;

        if (Platform.OS === 'android') {
          const oferta = ofertaAndroid(item);
          offerTokenAndroid = oferta?.offerTokenAndroid ?? null;
          // A politica do Google exige mostrar o preco que a Play Store devolve.
          return {
            id: item.id,
            title: item.title || METADADOS_PADRAO.title,
            description: item.description || METADADOS_PADRAO.description,
            displayPrice: oferta?.displayPrice || item.displayPrice || METADADOS_PADRAO.displayPrice,
            price: oferta?.price ?? item.price ?? METADADOS_PADRAO.price,
            currency: item.currency || METADADOS_PADRAO.currency,
          };
        }

        return {
          id: item.id,
          title: item.title || METADADOS_PADRAO.title,
          description: item.description || METADADOS_PADRAO.description,
          displayPrice: 'R$ 9,90',
          price: 9.9,
          currency: item.currency || 'BRL',
        };
      }
    } catch (err) {
      console.warn('[IAP] Erro ao buscar produto na loja:', err);
    }
  }

  // Fallback seguro em caso de indisponibilidade de rede ou sandbox local
  return METADADOS_PADRAO;
}

/**
 * Abre a folha nativa da loja para o usuario assinar.
 * O resultado real do pagamento e entregue pelo purchaseUpdatedListener.
 */
export async function solicitarAssinatura(): Promise<void> {
  await conectarStoreKit();

  if (Platform.OS === 'android') {
    if (!offerTokenAndroid) {
      await buscarProdutoAssinatura();
    }
    if (!offerTokenAndroid) {
      throw new Error('A assinatura ainda não está disponível na Play Store. Tente novamente mais tarde.');
    }

    await requestPurchase({
      request: {
        google: {
          skus: [IAP_SKU],
          subscriptionOffers: [{ sku: IAP_SKU, offerToken: offerTokenAndroid }],
        },
      },
      type: 'subs',
    });
    return;
  }

  await requestPurchase({
    request: {
      apple: { sku: IAP_SKU },
    },
    type: 'subs',
  });
}

/**
 * Valida a compra no backend do Feith e conclui na fila da loja.
 *
 * REGRA CRITICA: finishTransaction so pode ser executado depois do backend
 * responder 200. Se o backend falhar (ex: rede caiu), a transacao continua
 * na fila da loja e sera reprocessada automaticamente pelo listener no boot.
 */
export async function validarEFinalizarTransacao(
  purchase: Purchase,
): Promise<SubscriptionStatus> {
  let status: SubscriptionStatus;

  if (Platform.OS === 'android') {
    // Compra pendente (boleto, por exemplo) ainda nao foi paga: o Google nao
    // deixa confirmar, e ela volta pelo listener quando o pagamento cair.
    if (purchase.purchaseState === 'pending') {
      throw new Error('Pagamento pendente. Assim que for confirmado pela Play Store, sua assinatura será ativada.');
    }
    if (!purchase.purchaseToken) {
      throw new Error('Não foi possível obter o comprovante da compra na Play Store.');
    }

    status = await api.verifyGooglePurchase(purchase.purchaseToken, purchase.productId);
  } else {
    let jws = purchase.purchaseToken;

    // No StoreKit 2 no iOS, caso purchaseToken venha vazio, buscamos o JWS explicitamente
    if (!jws) {
      try {
        jws = await getTransactionJwsIOS(purchase.productId);
      } catch (err) {
        console.warn('[IAP] Falha ao obter JWS direto do StoreKit:', err);
      }
    }

    if (!jws) {
      throw new Error('Não foi possível obter o comprovante criptográfico (JWS) da Apple.');
    }

    // Valida contra o backend (que confere a cadeia de certificados da Apple)
    status = await api.verifyAppleTransaction(jws);
  }

  // Com a aprovacao confirmada no servidor, finaliza e tira da fila da loja
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (err) {
    console.warn('[IAP] Falha ao chamar finishTransaction apos verificacao:', err);
  }

  return status;
}

/**
 * Restaura compras ativas associadas a conta da loja do usuario.
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
 * Abre a tela nativa da loja para gerenciar ou cancelar a assinatura.
 */
export async function abrirGerenciadorAssinaturas(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await deepLinkToSubscriptions({ skuAndroid: IAP_SKU, packageNameAndroid: ANDROID_PACKAGE });
      return;
    } catch {
      // Fallback para a pagina de assinaturas da Play Store
    }
    await Linking.openURL(
      `https://play.google.com/store/account/subscriptions?sku=${IAP_SKU}&package=${ANDROID_PACKAGE}`,
    );
    return;
  }

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
