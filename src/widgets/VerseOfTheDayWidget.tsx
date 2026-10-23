import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '../theme/tokens';
import type { VerseWidgetData } from './types';

const DEEP_LINK = 'feith://hoje';

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
        borderRadius: 20,
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={scripture_reference}
        style={{
          fontSize: 13,
          fontWeight: 'bold',
          color: colors.oxblood as `#${string}`,
          marginBottom: 6,
        }}
      />
      <TextWidget
        text={excerpt}
        truncate="END"
        maxLines={4}
        style={{
          fontSize: 14,
          color: colors.ink as `#${string}`,
          lineHeight: 19,
        }}
      />
      {isStale ? (
        <TextWidget
          text="Toque para atualizar"
          style={{
            fontSize: 10,
            color: colors['ink-faint'] as `#${string}`,
            marginTop: 8,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}
