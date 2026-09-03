import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, Text, scheme } from '../../src/components/ui';

export default function Perfil() {
  const { summary, isSupporter, diasParaExpirar, signOut } = useAuth();
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  function confirmarSaida() {
    // `confirm()` da web (Sidebar.svelte:54) nao existe no RN.
    Alert.alert('Sair da conta', 'Você precisará entrar novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  /**
   * Exclusao de conta.
   *
   * Exigida pela diretriz 5.1.1(v): todo app que permite criar conta precisa
   * permitir apaga-la DENTRO do app. A senha e pedida como reautenticacao;
   * quem entrou por Google ou Apple nao tem senha e o backend aceita sem ela.
   */
  function confirmarExclusao() {
    Alert.alert(
      'Apagar conta',
      'Suas anotações, favoritos e histórico serão apagados. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () =>
            Alert.prompt(
              'Confirme sua senha',
              'Digite sua senha para apagar a conta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar conta',
                  style: 'destructive',
                  onPress: (senha?: string) => void apagar(senha),
                },
              ],
              'secure-text',
            ),
        },
      ],
    );
  }

  async function apagar(senha?: string) {
    setExcluindo(true);
    try {
      await api.deleteAccount(senha);
      await signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      Alert.alert('Não foi possível apagar', mensagemDe(e));
    } finally {
      setExcluindo(false);
    }
  }

  const quotas = summary?.quotas;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 48 }}>
        <Text variant="display" display weight="bold">
          Perfil
        </Text>

        <Card>
          <Text variant="title" display weight="bold">
            {summary?.username ?? '—'}
          </Text>
          <Text variant="caption" color={scheme.textSecondary} style={{ marginTop: 4 }}>
            {summary?.email ?? ''}
          </Text>
          <Text variant="caption" weight="semi" color={scheme.accent} style={{ marginTop: 12 }}>
            {isSupporter ? 'Apoiador' : 'Plano gratuito'}
          </Text>
        </Card>

        {/* Os limites vem do servidor, nunca de constantes no app: assim mudar
            uma quota e editar o .env, e nao publicar versao nova na App Store. */}
        {!isSupporter && quotas ? (
          <Card>
            <Text variant="caption" weight="semi" color={scheme.textSecondary}>
              SEU PLANO
            </Text>
            <Text variant="body" style={{ marginTop: 8 }}>
              {quotas.bookmarks_used} de {quotas.bookmarks_limit} favoritos
            </Text>
            <Text variant="body" style={{ marginTop: 4 }}>
              {quotas.notes_used_month} de {quotas.notes_limit} anotações neste mês
            </Text>
            {summary?.history_window_days ? (
              <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 8 }}>
                Histórico dos últimos {summary.history_window_days} dias.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Aviso de expiração: o app renova o token sozinho ao voltar para o
            primeiro plano, então isto só aparece para quem ficou dias sem abrir. */}
        {diasParaExpirar !== null ? (
          <Card>
            <Text variant="caption" color={scheme.textSecondary}>
              Sua sessão expira em {diasParaExpirar} {diasParaExpirar === 1 ? 'dia' : 'dias'}.
            </Text>
          </Card>
        ) : null}

        <View style={{ gap: 12 }}>
          <Button
            label="Editar perfil"
            variant="secondary"
            onPress={() => router.push('/perfil/editar')}
          />
          <Button
            label="Lembretes"
            variant="secondary"
            onPress={() => router.push('/perfil/notificacoes')}
          />
          <Button
            label="Privacidade"
            variant="ghost"
            onPress={() => router.push('/politicas')}
          />
        </View>

        <View style={{ marginTop: 8, gap: 12 }}>
          <Button label="Sair da conta" variant="secondary" onPress={confirmarSaida} />
          <Button
            label="Apagar minha conta"
            variant="ghost"
            onPress={confirmarExclusao}
            loading={excluindo}
            disabled={excluindo}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
