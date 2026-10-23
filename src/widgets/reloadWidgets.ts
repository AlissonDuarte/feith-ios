import { ExtensionStorage } from '@bacons/apple-targets';
import { Platform } from 'react-native';

import { api } from '../api/client';

const IOS_APP_GROUP = 'group.com.feith.app';
const IOS_CACHE_KEY = 'verseWidgetTeaser';

/**
 * Pede ao widget de tela inicial pra recarregar com o conteudo mais recente,
 * em vez de esperar o ciclo de refresh do sistema (meia-noite no iOS,
 * updatePeriodMillis no Android). Nunca deve derrubar a tela que chamou — e
 * so um empurrao de atualizacao, best-effort.
 */
export async function reloadWidgets(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      const { reloadAndroidWidget } = await import('./widgetTaskHandler');
      await reloadAndroidWidget();
    } else if (Platform.OS === 'ios') {
      const teaser = await api.getWidgetTeaser();
      // ExtensionStorage.set() so aceita string|number no tipo — is_fallback
      // e bool, mas a ponte nativa (JSONSerialization do lado Swift) aceita
      // qualquer valor serializavel. O VerseTeaser.swift em targets/widget
      // decodifica exatamente estas 3 chaves.
      new ExtensionStorage(IOS_APP_GROUP).set(IOS_CACHE_KEY, {
        scripture_reference: teaser.scripture_reference,
        excerpt: teaser.excerpt,
        is_fallback: teaser.is_fallback,
      } as unknown as Record<string, string | number>);
      ExtensionStorage.reloadWidget();
    }
  } catch {
    // Falha de widget nunca pode virar erro na tela que chamou.
  }
}
