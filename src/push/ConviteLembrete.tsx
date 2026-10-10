import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Button, Card, Overline, Text, scheme } from '../components/ui';
import { space } from '../theme/tokens';
import { useConviteLembrete } from './useConviteLembrete';

function textos(momento: 'pos_leitura' | 'sequencia' | 'ajustes', streak: number, hora: string) {
  if (momento === 'ajustes') {
    return {
      titulo: 'Seus lembretes estão bloqueados',
      corpo: 'As notificações do feith estão desativadas no aparelho. Ative em Ajustes › Notificações › feith para receber a reflexão todo dia.',
    };
  }
  if (momento === 'sequencia') {
    return {
      titulo: `${streak} dias seguidos de leitura`,
      corpo: `Ative o lembrete das ${hora} para não quebrar sua sequência.`,
    };
  }
  return {
    titulo: 'Quer ler de novo amanhã?',
    corpo: `Receba um lembrete às ${hora} com a reflexão do dia. Você pode mudar o horário em Perfil › Lembretes.`,
  };
}

export function ConviteLembrete({ streak, hora }: { streak: number; hora: string }) {
  const { momento, ativando, ativar, recusar, ajustes } = useConviteLembrete(streak);

  if (!momento || momento === 'onboarding') return null;

  const { titulo, corpo } = textos(momento, streak, hora);
  const bloqueado = momento === 'ajustes';

  return (
    <Card style={{ marginTop: space.xxl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons
          name={momento === 'sequencia' ? 'flame' : 'notifications-outline'}
          size={14}
          color={scheme.gold}
        />
        <Overline color={scheme.gold}>Lembrete diário</Overline>
      </View>
      <Text variant="heading" style={{ marginTop: space.sm }}>
        {titulo}
      </Text>
      <Text variant="bodySm" color={scheme.textSecondary} style={{ marginTop: space.xs }}>
        {corpo}
      </Text>
      <Button
        label={bloqueado ? 'Abrir Ajustes' : 'Ativar lembrete'}
        iconLeft={bloqueado ? 'settings-outline' : 'notifications-outline'}
        onPress={bloqueado ? ajustes : ativar}
        loading={ativando}
        disabled={ativando}
        style={{ marginTop: space.lg }}
      />
      <Button
        label="Agora não"
        variant="ghost"
        size="sm"
        onPress={recusar}
        disabled={ativando}
        style={{ marginTop: space.xs, alignSelf: 'center' }}
      />
    </Card>
  );
}
