/**
 * Tipos e constantes do StoreKit / Compras no App.
 */

import { Platform } from 'react-native';

export type PlanoId = 'monthly' | 'annual' | 'annual_family';

export const SKUS_POR_PLANO: Record<PlanoId, string> = {
  monthly: process.env.EXPO_PUBLIC_IAP_SKU || 'com.feith.app.supporter.monthly',
  annual: process.env.EXPO_PUBLIC_IAP_SKU_ANUAL || 'com.feith.app.supporter.annual',
  annual_family:
    process.env.EXPO_PUBLIC_IAP_SKU_ANUAL_FAMILIA || 'com.feith.app.supporter.annual.family',
};

export const PLANOS_IDS: PlanoId[] = ['monthly', 'annual', 'annual_family'];

export const PLANO_POR_SKU: Record<string, PlanoId> = Object.fromEntries(
  PLANOS_IDS.map((plano) => [SKUS_POR_PLANO[plano], plano]),
);

/** Mesmo valor de `android.package` no app.config.ts; a Play Store exige nos deep links. */
export const ANDROID_PACKAGE = 'com.feith.app';

/** Nome da loja para os textos da tela ("Processando na ..."). */
export const NOME_LOJA = Platform.OS === 'android' ? 'Play Store' : 'App Store';

export interface ProdutoAssinatura {
  id: string;
  plano: PlanoId;
  title: string;
  description: string;
  displayPrice: string;
  price?: number | null;
  currency: string;
}

export type IapStatus =
  | 'idle'
  | 'loading'
  | 'purchasing'
  | 'verifying'
  | 'restoring'
  | 'success'
  | 'error';

export interface IapState {
  status: IapStatus;
  produto: ProdutoAssinatura | null;
  erro: string | null;
}
