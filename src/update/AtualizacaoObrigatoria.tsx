import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccentHalo } from '../components/ornaments';
import { Button, GoldRule, Text, scheme } from '../components/ui';
import { space } from '../theme/tokens';
import { abrirLoja } from './useAtualizacao';

export function AtualizacaoObrigatoria({ storeUrl }: { storeUrl: string | null }) {
  return (
    <SafeAreaView style={styles.tela}>
      <AccentHalo />
      <View style={styles.conteudo}>
        <Ionicons name="arrow-up-circle-outline" size={44} color={scheme.gold} />
        <Text variant="title" style={styles.centro}>
          Atualize para continuar
        </Text>
        <GoldRule width={48} />
        <Text variant="bodySm" color={scheme.textSecondary} style={styles.centro}>
          Esta versão do feith não é mais compatível. Baixe a versão mais recente para seguir
          com suas leituras — suas anotações e favoritos continuam salvos.
        </Text>
      </View>
      <Button label="Atualizar agora" onPress={() => abrirLoja(storeUrl)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: scheme.canvas,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  centro: { textAlign: 'center' },
});
