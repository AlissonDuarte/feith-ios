import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, GoldRule, Overline, Text } from '../components/ui';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useFeatureOnboarding } from './useFeatureOnboarding';

/**
 * Montado uma vez em app/_layout.tsx (RouteGuard): quando o servidor tem um
 * onboarding de feature pendente pra esta conta, a folha abre sozinha — nao
 * depende de a pessoa "descobrir" a feature ou tocar em algum card primeiro.
 */
export function FeatureOnboardingModal() {
  const { scheme } = useTheme();
  const { item, resolvendo, completar, dispensar } = useFeatureOnboarding();

  return (
    <Modal
      visible={!!item}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={dispensar}
    >
      {item ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top', 'left', 'right']}>
          <View style={{ flex: 1, paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.lg }}>
            <Overline color={scheme.gold}>Novidade</Overline>
            <Text variant="display" style={{ marginTop: 6 }}>
              {item.title}
            </Text>
            <GoldRule align="left" width={48} color={scheme.gold} style={{ marginTop: space.md }} />

            <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.lg }}>
              {item.body}
            </Text>

            {item.steps.length > 0 ? (
              <View style={{ marginTop: space.xl, gap: space.lg }}>
                {item.steps.map((passo, i) => (
                  <View key={passo} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: scheme.goldSubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="micro" font="bodySemi" color={scheme.gold}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text variant="bodySm" color={scheme.textSecondary} style={{ flex: 1 }}>
                      {passo}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ flex: 1 }} />

            <Button
              label={item.cta_label}
              onPress={completar}
              loading={resolvendo}
              disabled={resolvendo}
              style={{ marginTop: space.xxl }}
            />
            <Button
              label="Agora não"
              variant="ghost"
              size="sm"
              onPress={dispensar}
              disabled={resolvendo}
              style={{ marginTop: space.xs, alignSelf: 'center' }}
            />
          </View>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}
