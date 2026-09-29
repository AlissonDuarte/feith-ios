/**
 * Tipos e constantes do StoreKit / Compras no App.
 */

import { Platform } from 'react-native';

export const IAP_SKU =
  process.env.EXPO_PUBLIC_IAP_SKU || 'com.feith.app.supporter.monthly';

/** Mesmo valor de `android.package` no app.config.ts; a Play Store exige nos deep links. */
export const ANDROID_PACKAGE = 'com.feith.app';

/** Nome da loja para os textos da tela ("Processando na ..."). */
export const NOME_LOJA = Platform.OS === 'android' ? 'Play Store' : 'App Store';

export interface ProdutoAssinatura {
  id: string;
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
