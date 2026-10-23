import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '../theme/tokens';
import type { VerseWidgetData } from './types';

const DEEP_LINK = 'feith://hoje';

/**
 * `fontFamily: 'serif'` e a familia GENERICA do Android (mapeia pra Noto
 * Serif/Droid Serif do sistema) — da o mesmo espirito editorial do resto do
 * app (Cormorant Garamond) sem embutir arquivo de fonte na config do widget,
 * que `react-native-android-widget` nao suporta bem via RemoteViews.
 */
const SERIF = 'serif';

export function VerseOfTheDayWidget({ scripture_reference, excerpt, isStale }: VerseWidgetData) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: DEEP_LINK }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: colors.cream as `#${string}`,
        padding: 16,
        borderRadius: 22,
        flexDirection: 'column',
      }}
    >
      <TextWidget
        text={scripture_reference}
        style={{
          fontFamily: SERIF,
          fontSize: 16,
          fontWeight: '600',
          color: colors.oxblood as `#${string}`,
        }}
      />

      {/* Fio de ouro, mesma funcao do GoldRule do app: um traco curto que
          desvanece pra direita, nao uma linha solida de ponta a ponta. */}
      <FlexWidget
        style={{
          width: 32,
          height: 2,
          marginTop: 7,
          marginBottom: 9,
          backgroundGradient: {
            from: colors['gold-light'] as `#${string}`,
            to: 'rgba(184, 156, 92, 0)',
            orientation: 'LEFT_RIGHT',
          },
        }}
      />

      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={excerpt}
          truncate="END"
          maxLines={4}
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            color: colors['ink-soft'] as `#${string}`,
            lineHeight: 20,
          }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <TextWidget
          text={isStale ? 'Toque para atualizar' : ''}
          style={{ fontSize: 10, color: colors['ink-faint'] as `#${string}` }}
        />
        <TextWidget
          text="feith"
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontWeight: '600',
            fontSize: 11,
            letterSpacing: 0.5,
            color: colors['gold-light'] as `#${string}`,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
