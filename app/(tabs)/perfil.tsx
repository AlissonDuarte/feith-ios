import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import { AccentHalo } from '../../src/components/ornaments';
import {
  Button,
  Card,
  GoldRule,
  ListRow,
  Overline,
  RowGroup,
  ScreenHeader,
  Text,
  scheme,
  useEspacoTabBar,
} from '../../src/components/ui';
import { useIap } from '../../src/iap/IapContext';
import { fonts, radius, space } from '../../src/theme/tokens';

function Medidor({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number }) {
  const razao = limite > 0 ? Math.min(1, usado / limite) : 0;
  const perto = razao >= 0.85;

  return (
    <View style={{ marginTop: space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="bodySm" font="bodyMedium" color={scheme.textPrimary}>
          {rotulo}
        </Text>
        <Text variant="caption" font="bodySemi" color={perto ? scheme.accent : scheme.textSecondary}>
          {usado} <Text variant="caption" color={scheme.textGhost}>/ {limite}</Text>
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: limite, now: usado }}
        style={estilos.trilho}
      >
        <View
          style={[
            estilos.preenchimento,
            {
              width: `${Math.max(razao * 100, razao > 0 ? 3 : 0)}%`,
              backgroundColor: perto ? scheme.accent : scheme.gold,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function Perfil() {
  const { summary, isSupporter, diasParaExpirar, signOut } = useAuth();
  const { gerenciar } = useIap();
  const router = useRouter();
  const { respiro } = useEspacoTabBar();
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
  const nome = summary?.username ?? '—';
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['top']}>
      <AccentHalo height={380} opacity={0.65} />
      <ScreenHeader overline="Sua conta" title="Perfil" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          paddingTop: space.xl,
          paddingBottom: respiro,
          gap: space.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <View style={estilos.monograma}>
            <Text style={estilos.monogramaTexto}>
              {inicial}
            </Text>
          </View>

          <Text style={estilos.nome}>
            {nome}
          </Text>
          <Text variant="bodySm" color={scheme.textMuted} style={{ marginTop: 2, textAlign: 'center' }}>
            {summary?.email ?? ''}
          </Text>

          <GoldRule width={48} style={{ marginVertical: space.xl }} />

          <View style={[estilos.badge, isSupporter ? estilos.badgeApoiador : estilos.badgeGratuito]}>
            {isSupporter ? <Ionicons name="ribbon-outline" size={14} color={scheme.gold} /> : null}
            <Text
              variant="micro"
              font="bodySemi"
              color={isSupporter ? scheme.gold : scheme.textSecondary}
              style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}
            >
              {isSupporter ? 'Apoiador Feith' : 'Plano Gratuito'}
            </Text>
          </View>
        </Card>

        {!isSupporter && quotas ? (
          <Card>
            <Overline>Seu plano</Overline>
            <Medidor
              rotulo="Favoritos"
              usado={quotas.bookmarks_used}
              limite={quotas.bookmarks_limit}
            />
            <Medidor
              rotulo="Anotações neste mês"
              usado={quotas.notes_used_month}
              limite={quotas.notes_limit}
            />
            {summary?.history_window_days ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xl }}>
                <Ionicons name="time-outline" size={14} color={scheme.textGhost} />
                <Text variant="caption" color={scheme.textGhost}>
                  Histórico dos últimos {summary.history_window_days} dias.
                </Text>
              </View>
            ) : null}

            <Button
              label="Tornar-se Apoiador"
              variant="primary"
              icon="arrow-forward"
              style={{ marginTop: space.xl }}
              onPress={() => router.push('/assinatura')}
            />
          </Card>
        ) : null}

        {isSupporter && summary?.provider === 'apple' ? (
          <RowGroup titulo="Assinatura">
            <ListRow
              icon="ribbon-outline"
              iconBg="rgba(139,105,20,0.10)"
              iconColor={scheme.gold}
              label="Gerenciar na App Store"
              onPress={() => void gerenciar()}
              ultimo
            />
          </RowGroup>
        ) : null}

        {diasParaExpirar !== null ? (
          <View style={estilos.bannerExpiracao}>
            <Ionicons name="information-circle-outline" size={18} color={scheme.accent} />
            <Text variant="caption" color={scheme.textSecondary} style={{ flex: 1 }}>
              Sua sessão expira em {diasParaExpirar}{' '}
              {diasParaExpirar === 1 ? 'dia' : 'dias'}.
            </Text>
          </View>
        ) : null}

        <RowGroup titulo="Preferências">
          <ListRow
            icon="person-outline"
            iconBg="rgba(122,31,31,0.08)"
            iconColor={scheme.accent}
            label="Editar perfil"
            onPress={() => router.push('/perfil/editar')}
          />
          <ListRow
            icon="notifications-outline"
            iconBg="rgba(139,105,20,0.10)"
            iconColor={scheme.gold}
            label="Lembretes"
            onPress={() => router.push('/perfil/notificacoes')}
            ultimo
          />
        </RowGroup>

        <RowGroup titulo="Sobre">
          <ListRow
            icon="shield-checkmark-outline"
            iconBg={scheme.canvasWarm}
            iconColor={scheme.textSecondary}
            label="Privacidade"
            onPress={() => router.push('/politicas')}
            ultimo
          />
        </RowGroup>

        <RowGroup titulo="Conta">
          <ListRow
            icon="log-out-outline"
            iconBg={scheme.canvasWarm}
            iconColor={scheme.textSecondary}
            label="Sair da conta"
            onPress={confirmarSaida}
          />
          <ListRow
            icon="trash-outline"
            iconBg="#FBF0EF"
            iconColor="#9B2C2C"
            label={excluindo ? 'Apagando…' : 'Apagar minha conta'}
            onPress={confirmarExclusao}
            destrutivo
            ultimo
          />
        </RowGroup>

        <View style={{ alignItems: 'center', paddingTop: space.xs, paddingBottom: space.md }}>
          <Text
            variant="micro"
            color={scheme.textGhost}
            style={{ textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }}
          >
            feith • exegese diária
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  monograma: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: scheme.goldSoft,
    backgroundColor: scheme.goldSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramaTexto: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 46,
    color: scheme.gold,
  },
  nome: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
    color: scheme.textPrimary,
    marginTop: space.md,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeApoiador: {
    backgroundColor: scheme.goldSubtle,
    borderWidth: 1,
    borderColor: scheme.goldSoft,
  },
  badgeGratuito: {
    backgroundColor: scheme.canvasWarm,
    borderWidth: 1,
    borderColor: scheme.border,
  },
  trilho: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: scheme.canvasWarm,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  preenchimento: {
    height: 6,
    borderRadius: radius.pill,
  },
  bannerExpiracao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: scheme.accentSubtle,
    borderWidth: 1,
    borderColor: 'rgba(122,31,31,0.15)',
  },
});
