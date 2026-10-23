import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestWidgetUpdate,
  type WidgetTaskHandler,
} from 'react-native-android-widget';

import { api } from '../api/client';
import { VerseOfTheDayWidget } from './VerseOfTheDayWidget';
import { getLocalFallbackVerse } from './fallbackVerses';
import type { VerseWidgetData } from './types';

const WIDGET_NAME = 'VerseOfTheDay';
const CACHE_KEY = 'widget.verseOfTheDay.lastTeaser';

async function resolveVerseData(): Promise<VerseWidgetData> {
  try {
    const teaser = await api.getWidgetTeaser();
    const data: VerseWidgetData = {
      scripture_reference: teaser.scripture_reference,
      excerpt: teaser.excerpt,
      isFallback: teaser.is_fallback,
      isStale: false,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return data;
  } catch {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: VerseWidgetData = JSON.parse(cached);
      return { ...data, isStale: true };
    }

    const local = getLocalFallbackVerse(new Date());
    return {
      scripture_reference: local.scripture_reference,
      excerpt: local.excerpt,
      isFallback: true,
      isStale: true,
    };
  }
}

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await resolveVerseData();
      props.renderWidget(<VerseOfTheDayWidget {...data} />);
      break;
    }
    default:
      break;
  }
};

/** Chamado pelo app apos buscar a reflexao de hoje, pra nao esperar o ciclo de refresh do sistema. */
export async function reloadAndroidWidget(): Promise<void> {
  const data = await resolveVerseData();
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: () => <VerseOfTheDayWidget {...data} />,
  });
}
