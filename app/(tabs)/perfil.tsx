import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import {
  Card,
  GoldRule,
  ListRow,
  Overline,
  RowGroup,
  ScreenHeader,
  Tag,
  Text,
  scheme,
  useEspacoTabBar,
} from '../../src/components/ui';
import { fonts, radius, space } from '../../src/theme/tokens';

/**
 * Medidor de quota.
 *
 * A tela antiga dizia "3 de 20 favoritos" em texto corrido. O numero sozinho
 * nao responde a pergunta que a pessoa faz de fato — "quanto ainda me resta?" —
 * e o fio preenchido responde antes da leitura. Fica em ouro ate 85%, e vira
 * oxblood quando o limite esta perto: e o unico momento em que a cor de acao
 * tem algo a dizer aqui.
 */
function Medidor({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number }) {
  const razao = limite > 0 ? Math.min(1, usado / limite) : 0;
  const perto = razao >= 0.85;

  return (
    <View style={{ marginTop: space.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="bodySm" color={scheme.textSecondary}>
          {rotulo}
        </Text>
        <Text variant="micro" font="bodySemi" color={perto ? scheme.accent : scheme.textMuted}>
          {usado} / {limite}
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
              backgroundColor: perto ? scheme.accent : scheme.goldSoft,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function Perfil() {
  const { summary, isSupporter, diasParaExpirar, signOut } = useAuth();
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
        {/* ── Identidade ────────────────────────────────────────────────
            Monograma em serifada no lugar de um avatar: o backend nao guarda
            foto, e um placeholder cinza de pessoa e o detalhe que mais faz um
            app parecer inacabado. */}
        <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
          <View style={estilos.monograma}>
            <Text
              style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 44, color: scheme.gold }}
            >
              {inicial}
            </Text>
          </View>

          <Text variant="title" style={{ marginTop: space.lg, textAlign: 'center' }}>
            {nome}
          </Text>
          <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 4 }}>
            {summary?.email ?? ''}
          </Text>

          <GoldRule width={48} style={{ marginVertical: space.xl }} />

          <Tag
            icon={isSupporter ? 'ribbon-outline' : undefined}
            color={isSupporter ? scheme.gold : scheme.textMuted}
            border={isSupporter ? scheme.goldSoft : scheme.border}
            background={isSupporter ? scheme.goldSubtle : 'transparent'}
          >
            {isSupporter ? 'Apoiador' : 'Plano gratuito'}
          </Tag>
        </Card>

        {/* Os limites vem do servidor, nunca de constantes no app: assim mudar
            uma quota e editar o .env, e nao publicar versao nova na App Store. */}
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
              <Text variant="caption" color={scheme.textGhost} style={{ marginTop: space.xl }}>
                Histórico dos últimos {summary.history_window_days} dias.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Aviso de expiração: o app renova o token sozinho ao voltar para o
            primeiro plano, então isto só aparece para quem ficou dias sem abrir. */}
        {diasParaExpirar !== null ? (
          <Card quiet>
            <Text variant="caption" color={scheme.textSecondary}>
              Sua sessão expira em {diasParaExpirar}{' '}
              {diasParaExpirar === 1 ? 'dia' : 'dias'}.
            </Text>
          </Card>
        ) : null}

        <RowGroup titulo="Preferências">
          <ListRow
            icon="person-outline"
            label="Editar perfil"
            onPress={() => router.push('/perfil/editar')}
          />
          <ListRow
            icon="notifications-outline"
            label="Lembretes"
            onPress={() => router.push('/perfil/notificacoes')}
            ultimo
          />
        </RowGroup>

        <RowGroup titulo="Sobre">
          <ListRow
            icon="document-text-outline"
            label="Privacidade"
            onPress={() => router.push('/politicas')}
            ultimo
          />
        </RowGroup>

        <RowGroup>
          <ListRow icon="log-out-outline" label="Sair da conta" onPress={confirmarSaida} />
          <ListRow
            icon="trash-outline"
            label={excluindo ? 'Apagando…' : 'Apagar minha conta'}
            onPress={confirmarExclusao}
            destrutivo
            ultimo
          />
        </RowGroup>

        <Text
          variant="micro"
          color={scheme.textGhost}
          style={{ textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }}
        >
          feith
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  monograma: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: scheme.goldSoft,
    backgroundColor: scheme.goldSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trilho: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: scheme.borderSoft,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  preenchimento: {
    height: 3,
    borderRadius: radius.pill,
  },
});
