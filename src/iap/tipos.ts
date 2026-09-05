/**
 * Tipos e constantes do StoreKit / Compras no App.
 */

export const IAP_SKU =
  process.env.EXPO_PUBLIC_IAP_SKU || 'com.feith.app.supporter.monthly';

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
