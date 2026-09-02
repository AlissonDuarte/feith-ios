import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, Text, scheme } from '../../src/components/ui';

export default function Perfil() {
  const { profile, isSupporter, diasParaExpirar, signOut } = useAuth();

  function confirmarSaida() {
    // `confirm()` da web (Sidebar.svelte:54) nao existe no RN.
    Alert.alert('Sair da conta', 'Você precisará entrar novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text variant="display" display weight="bold">
          Perfil
        </Text>

        <Card>
          <Text variant="title" display weight="bold">
            {profile?.username ?? '—'}
          </Text>
          <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 4 }}>
            {profile?.email ?? ''}
          </Text>
          <Text variant="caption" weight="semi" color={scheme.accent} style={{ marginTop: 12 }}>
            {isSupporter ? 'Apoiador' : 'Plano gratuito'}
          </Text>
        </Card>

        {/* O JWT do backend dura 7 dias e nao ha refresh (auth_service.py:71).
            Ate o endpoint existir, avisar antes e melhor do que deslogar a
            pessoa no meio da leitura. */}
        {diasParaExpirar !== null ? (
          <Card>
            <Text variant="caption" color={scheme.textSecondary}>
              Sua sessão expira em {diasParaExpirar}{' '}
              {diasParaExpirar === 1 ? 'dia' : 'dias'}. Você precisará entrar de novo.
            </Text>
          </Card>
        ) : null}

        <View style={{ marginTop: 8 }}>
          <Button label="Sair da conta" variant="secondary" onPress={confirmarSaida} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
