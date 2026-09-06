import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { Reflection } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { BotaoFavorito } from '../../src/components/BotaoFavorito';
import { NotaSheet } from '../../src/components/NotaSheet';
import { AccentHalo } from '../../src/components/ornaments';
import { ReflexaoReader } from '../../src/components/ReflexaoReader';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Loading,
  Overline,
  Text,
  scheme,
  useEspacoTabBar,
} from '../../src/components/ui';
import { PlayerAudio } from '../../src/player/PlayerAudio';
import { radius, shadow, space } from '../../src/theme/tokens';

export default function Hoje() {
  const router = useRouter();
  // O streak vem do summary do AuthContext, que ja e compartilhado por todas
  // as telas — buscar /streaks/me aqui seria a mesma duplicacao que a web faz.
  const { summary, refreshSummary, isSupporter } = useAuth();
  const { altura: alturaTabBar, respiro } = useEspacoTabBar();

  const [reflexao, setReflexao] = useState<Reflection | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const daily = await api.getDailyReflection();
      setReflexao(daily);

      // Este GET tem efeito colateral: ele registra a leitura de hoje
      // (reflection_views.py:37), que e o que alimenta o streak. Recarregar o
      // summary DEPOIS dele — e nunca antes — e o que faz o contador subir no
      // mesmo instante em que a pessoa abre a reflexao.
      await refreshSummary();
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [refreshSummary]);

  useEffect(() => {
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  const compartilhar = useCallback(async () => {
    if (!reflexao?.uuid) return;
    try {
      const link = await api.createShareLink(reflexao.uuid);
      const trecho = reflexao.bible_text?.trim()
        ? `"${reflexao.bible_text.length > 200 ? reflexao.bible_text.slice(0, 200).trim() + '...' : reflexao.bible_text.trim()}"\n\n`
        : '';

      await Share.share(
        {
          title: `${reflexao.scripture_reference} — feith`,
          message: `📖 ${reflexao.scripture_reference}\n\n${trecho}Leia a reflexão e exegese completa no feith:\n${link.url}`,
          url: link.url,
        },
        {
          subject: `${reflexao.scripture_reference} — feith`,
        },
      );
    } catch (e) {
      setErro(mensagemDe(e));
    }
  }, [reflexao]);

  const puxarParaAtualizar = useCallback(async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }, [carregar]);

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <Loading />
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível carregar"
          descricao={erro}
          acao={<Button label="Tentar de novo" onPress={puxarParaAtualizar} />}
        />
      </SafeAreaView>
    );
  }

  // Quando nao ha reflexao publicada, o backend NAO devolve 404: ele devolve
  // todos os campos em branco com uuid vazio (reflection_service.py:39-51).
  // Sem este ramo, a tela renderizaria cards vazios e pareceria quebrada — que
  // e exatamente o que um revisor da App Store veria num dia sem conteudo.
  if (!reflexao || !reflexao.uuid) {
    return (
      <SafeAreaView style={estilos.tela}>
        <EmptyState
          icone="hourglass-outline"
          titulo="A reflexão de hoje ainda não saiu"
          descricao="Assim que ela for publicada, você a encontra aqui. Enquanto isso, seu histórico continua disponível."
          acao={
            <Button label="Atualizar" variant="secondary" onPress={puxarParaAtualizar} />
          }
        />
      </SafeAreaView>
    );
  }

  const streak = summary?.streak ?? 0;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      {/* Halo de oxblood atras da abertura — o mesmo do hero da landing. Da
          profundidade ao topo da pagina sem colocar nada nele. */}
      <AccentHalo height={360} />

      {/* ── Barra superior ────────────────────────────────────────────────
          Sem titulo: o titulo da tela e a propria referencia biblica, logo
          abaixo. Repetir "Hoje" aqui gastaria a linha mais nobre da tela. */}
      <View style={estilos.barra}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {streak > 0 ? (
            <View style={estilos.streak}>
              <Ionicons name="flame" size={12} color={scheme.gold} />
              <Text variant="micro" font="bodySemi" color={scheme.gold}>
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </Text>
            </View>
          ) : null}

          {!isSupporter ? (
            <Pressable
              onPress={() => router.push('/assinatura')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Conhecer plano Apoiador"
              style={({ pressed }) => [estilos.badgeApoiador, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="ribbon-outline" size={12} color={scheme.gold} />
              <Text variant="micro" font="bodySemi" color={scheme.gold} style={{ letterSpacing: 1 }}>
                APOIADOR
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <BotaoFavorito
            reflectionUuid={reflexao.uuid}
            favoritado={reflexao.bookmarked}
            onMudou={(v) => setReflexao((r) => (r ? { ...r, bookmarked: v } : r))}
            emMoldura
          />
          <IconButton name="share-outline" label="Compartilhar" onPress={compartilhar} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.gutter,
          // O `respiro` cobre a tab bar e o FAB. Com o player empilhado por
          // cima do FAB, o fim da oracao ficaria atras dele — dai a altura da
          // pilula (46) mais o gap.
          paddingBottom: isSupporter ? respiro + 46 + space.md : respiro,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={puxarParaAtualizar}
            tintColor={scheme.accent}
          />
        }
      >
        <ReflexaoReader reflexao={reflexao} />

        {!isSupporter ? (
          <Card quiet style={{ marginTop: space.xxl, marginBottom: space.lg, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="ribbon-outline" size={14} color={scheme.gold} />
              <Overline color={scheme.gold}>Plano Apoiador</Overline>
            </View>
            <Text variant="caption" color={scheme.textSecondary} style={{ textAlign: 'center', marginTop: 2 }}>
              Aprofunde seu momento diário com áudio narrado e acervo completo.
            </Text>
            <Button
              label="Conhecer plano Apoiador"
              variant="ghost"
              size="sm"
              icon="arrow-forward"
              style={{ marginTop: space.sm }}
              onPress={() => router.push('/assinatura')}
            />
          </Card>
        ) : null}
      </ScrollView>

      {/* Botao fixo, e nao o FAB arrastavel da web (Note.svelte): arrastar
          briga com o gesto de voltar do iOS e com o scroll.
          Pilula com rotulo em vez de circulo com icone: "anotar" e a acao que
          o produto quer estimular, e um icone de lapis sozinho nao a promete
          para quem nunca a usou. */}
      <View
        style={[estilos.ancora, { bottom: Math.max(96, alturaTabBar + space.lg) }]}
        pointerEvents="box-none"
      >
        <PlayerAudio
          reflectionUuid={reflexao.uuid}
          referencia={reflexao.scripture_reference}
          onAnotar={() => setEscrevendo(true)}
        />
      </View>

      <NotaSheet
        visivel={escrevendo}
        reflectionUuid={reflexao.uuid}
        onFechar={() => setEscrevendo(false)}
        onSalvou={() => setEscrevendo(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: scheme.canvas },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: scheme.goldSoft,
    backgroundColor: scheme.goldSubtle,
    borderRadius: radius.sharp,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeApoiador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(139,105,20,0.30)',
    backgroundColor: 'rgba(139,105,20,0.08)',
    borderRadius: radius.sharp,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  // `bottom` vem da tela: e a altura real da tab bar mais a safe area, para o
  // botao ficar ACIMA dela e nao atras do vidro.
  ancora: {
    position: 'absolute',
    right: space.gutter,
    // Player e ANOTAR empilhados, alinhados a direita: o card do player e mais
    // largo que a pilula, e sem isto ele empurraria o ANOTAR para o centro.
    alignItems: 'flex-end',
    gap: space.md,
    zIndex: 99,
    elevation: 10,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.sharp,
    backgroundColor: scheme.accent,
    ...shadow.raised,
  },
  fabPressed: {
    backgroundColor: scheme.accentPressed,
    opacity: 0.9,
  },
});
