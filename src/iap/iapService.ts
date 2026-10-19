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
import {
  ANDROID_PACKAGE,
  PLANO_POR_SKU,
  PLANOS_IDS,
  SKUS_POR_PLANO,
  type PlanoId,
  type ProdutoAssinatura,
} from './tipos';

let conexaoIniciada = false;

/**
 * No Android a compra de assinatura exige o offerToken do plano base, que so
 * vem no fetchProducts. Guardado aqui para o solicitarAssinatura nao precisar
 * buscar de novo a cada toque no botao.
 */
const offerTokensAndroid: Partial<Record<PlanoId, string>> = {};

const METADADOS_PADRAO: Record<PlanoId, ProdutoAssinatura> = {
  monthly: {
    id: SKUS_POR_PLANO.monthly,
    plano: 'monthly',
    title: 'Apoiador Feith Mensal',
    description: 'Acesso ao áudio diário, acervo completo e reflexões ilimitadas.',
    displayPrice: 'R$ 9,90',
    price: 9.9,
    currency: 'BRL',
  },
  annual: {
    id: SKUS_POR_PLANO.annual,
    plano: 'annual',
    title: 'Apoiador Anual',
    description: 'O mesmo acesso completo, com desconto por pagar uma vez ao ano.',
    displayPrice: 'R$ 69,90',
    price: 69.9,
    currency: 'BRL',
  },
  annual_family: {
    id: SKUS_POR_PLANO.annual_family,
    plano: 'annual_family',
    title: 'Apoiador Anual Família',
    description: 'Acesso completo para até 6 pessoas da família, em um só plano anual.',
    displayPrice: 'R$ 99,90',
    price: 99.9,
    currency: 'BRL',
  },
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
 * Oferta do plano base. Ofertas promocionais (teste gratis, desconto) tem
 * `id` proprio; o plano base puro vem sem id. O Google so lista a
 * promocional para quem e elegivel, entao preferir ela quando presente e o
 * que aplica o teste gratis na compra.
 */
function ofertaAndroid(item: ProductSubscription) {
  const ofertas = (item.subscriptionOffers ?? []).filter((o) => o.offerTokenAndroid);
  return ofertas.find((o) => o.id) ?? ofertas[0] ?? null;
}

/**
 * Busca informacoes atualizadas dos tres planos de assinatura na loja, numa
 * so chamada. Planos que a loja ainda nao tem cadastrado (ex: anual/familia
 * ainda em revisao) caem no fallback — a tela mostra o preco padrao em vez de
 * travar.
 */
export async function buscarProdutosAssinatura(): Promise<Record<PlanoId, ProdutoAssinatura>> {
  const conectado = await conectarStoreKit();
  const resultado: Record<PlanoId, ProdutoAssinatura> = { ...METADADOS_PADRAO };

  if (!conectado) return resultado;

  try {
    const produtos = await fetchProducts({
      skus: PLANOS_IDS.map((plano) => SKUS_POR_PLANO[plano]),
      type: 'subs',
    });

    for (const produto of produtos ?? []) {
      const item = produto as ProductSubscription;
      const plano = PLANO_POR_SKU[item.id];
      if (!plano) continue;

      if (Platform.OS === 'android') {
        const oferta = ofertaAndroid(item);
        if (oferta?.offerTokenAndroid) offerTokensAndroid[plano] = oferta.offerTokenAndroid;
        // A politica do Google exige mostrar o preco que a Play Store devolve.
        resultado[plano] = {
          id: item.id,
          plano,
          title: item.title || METADADOS_PADRAO[plano].title,
          description: item.description || METADADOS_PADRAO[plano].description,
          displayPrice:
            oferta?.displayPrice || item.displayPrice || METADADOS_PADRAO[plano].displayPrice,
          price: oferta?.price ?? item.price ?? METADADOS_PADRAO[plano].price,
          currency: item.currency || METADADOS_PADRAO[plano].currency,
        };
        continue;
      }

      resultado[plano] = {
        id: item.id,
        plano,
        title: item.title || METADADOS_PADRAO[plano].title,
        description: item.description || METADADOS_PADRAO[plano].description,
        displayPrice: item.displayPrice || METADADOS_PADRAO[plano].displayPrice,
        price: item.price ?? METADADOS_PADRAO[plano].price,
        currency: item.currency || METADADOS_PADRAO[plano].currency,
      };
    }
  } catch (err) {
    console.warn('[IAP] Erro ao buscar produtos na loja:', err);
  }

  return resultado;
}

/**
 * Abre a folha nativa da loja para o usuario assinar o plano escolhido.
 * O resultado real do pagamento e entregue pelo purchaseUpdatedListener.
 */
export async function solicitarAssinatura(plano: PlanoId): Promise<void> {
  await conectarStoreKit();
  const sku = SKUS_POR_PLANO[plano];

  if (Platform.OS === 'android') {
    if (!offerTokensAndroid[plano]) {
      await buscarProdutosAssinatura();
    }
    const offerToken = offerTokensAndroid[plano];
    if (!offerToken) {
      throw new Error('A assinatura ainda não está disponível na Play Store. Tente novamente mais tarde.');
    }

    await requestPurchase({
      request: {
        google: {
          skus: [sku],
          subscriptionOffers: [{ sku, offerToken }],
        },
      },
      type: 'subs',
    });
    return;
  }

  await requestPurchase({
    request: {
      apple: { sku },
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

  // Procura transacoes associadas a qualquer um dos tres planos do Feith
  const comprasFeith = compras.filter((c) => c.productId in PLANO_POR_SKU);
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
    // A pagina de assinaturas da Play Store e geral, nao por plano: o sku so
    // ajuda o deep link a abrir direto nela, nao importa qual dos tres planos
    // a pessoa tenha.
    const sku = SKUS_POR_PLANO.monthly;
    try {
      await deepLinkToSubscriptions({ skuAndroid: sku, packageNameAndroid: ANDROID_PACKAGE });
      return;
    } catch {
      // Fallback para a pagina de assinaturas da Play Store
    }
    await Linking.openURL(
      `https://play.google.com/store/account/subscriptions?sku=${sku}&package=${ANDROID_PACKAGE}`,
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
