import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { WEB_URL, api } from '../../../src/api/client';
import type { TrailSummary } from '../../../src/api/types';
import { Button, IconButton, Overline, Text } from '../../../src/components/ui';
import { posthog } from '../../../src/config/posthog';
import { TrailBadgeCard } from '../../../src/share/TrailBadgeCard';
import { useShareCardExport } from '../../../src/share/useShareCardExport';
import { CapaTrilha } from '../../../src/trilhas/componentes';
import { useTheme } from '../../../src/theme/ThemeContext';
import { fonts, radius, shadow, space, type Scheme } from '../../../src/theme/tokens';

const DEGRAUS = [3, 7, 14];

export default function TrilhaConcluida() {
  const params = useLocalSearchParams<{
    slug: string;
    dias?: string;
    minutos?: string;
    notas?: string;
    selo?: string;
    proxima?: string;
  }>();
  const router = useRouter();
  const { scheme } = useTheme();
  const estilos = useMemo(() => criarEstilos(scheme), [scheme]);
  const [atual, setAtual] = useState<TrailSummary | null>(null);
  const [proxima, setProxima] = useState<TrailSummary | null>(null);
  const [copiado, setCopiado] = useState(false);
  const { ref: refCartao, erro: erroCartao, compartilhar: compartilharImagem } = useShareCardExport();

  useEffect(() => {
    api
      .getTrails()
      .then((catalogo) => {
        setAtual(catalogo.trails.find((t) => t.slug === params.slug) ?? null);
        setProxima(catalogo.trails.find((t) => t.slug === params.proxima) ?? null);
      })
      .catch(() => undefined);
  }, [params.slug, params.proxima]);

  const dias = Number(params.dias ?? 0);
  const nome = atual?.name ?? 'Trilha concluída';
  const mensagem = `Concluí a trilha "${nome}" no feith: ${dias} dias com a Palavra, um passo por dia. ${WEB_URL}`;
  const degrau = DEGRAUS.findIndex((d) => dias <= d);

  function registrar(canal: string) {
    posthog?.capture('trail_shared', { trail: params.slug, channel: canal });
  }

  async function compartilhar() {
    registrar('sheet');
    // Imagem (e nao Share.share so-texto): e o que faz o Instagram aparecer
    // no menu nativo — a mesma razao do cartao de reflexao em
    // leitura/compartilhar-cartao.tsx.
    await compartilharImagem('Compartilhar conquista');
  }

  async function whatsapp() {
    registrar('whatsapp');
    const url = `whatsapp://send?text=${encodeURIComponent(mensagem)}`;
    if (await Linking.canOpenURL(url).catch(() => false)) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: mensagem });
    }
  }

  async function copiar() {
    registrar('copy');
    await Clipboard.setStringAsync(mensagem);
    setCopiado(true);
  }

  function seguir() {
    if (!proxima) {
      router.replace('/(tabs)/trilhas');
      return;
    }
    if (proxima.locked) {
      router.push({ pathname: '/assinatura', params: { origem: 'trilha' } });
      return;
    }
    router.replace({ pathname: '/trilha/[slug]', params: { slug: proxima.slug } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      {/* Fora da tela: so existe para o ViewShot ter o que capturar quando
          "Compartilhar" gera a imagem (e' isso que faz o Instagram aparecer
          no menu nativo — texto puro ele nao aceita). */}
      <View style={{ position: 'absolute', left: -9999, top: 0 }} pointerEvents="none">
        <ViewShot ref={refCartao} options={{ format: 'png', quality: 1 }}>
          <TrailBadgeCard template="oxblood" trailName={nome} days={dias} sealEarned={params.selo === '1'} />
        </ViewShot>
      </View>

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
        <IconButton name="close" label="Fechar" onPress={() => router.replace('/(tabs)/trilhas')} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingBottom: space.section }}>
        <View style={{ alignItems: 'center' }}>
          <Overline color={scheme.gold}>Trilha concluída</Overline>
          <View style={[estilos.selo, shadow.raised]}>
            <Ionicons name="footsteps-outline" size={48} color="#FFFFFF" />
          </View>
          <Text variant="display" style={{ textAlign: 'center', marginTop: space.lg }}>
            {nome}
          </Text>
          <Text variant="bodySm" color={scheme.textSecondary} style={{ textAlign: 'center', marginTop: space.sm }}>
            {params.selo === '1'
              ? `Você caminhou ${dias} dias com a Palavra, um passo por dia, e concluiu no prazo. O selo é seu.`
              : `Você caminhou ${dias} dias com a Palavra, um passo por dia.`}
          </Text>
        </View>

        <View style={estilos.numeros}>
          {[
            { valor: `${dias}/${atual?.days_count ?? dias}`, rotulo: 'dias' },
            { valor: params.minutos ?? '0', rotulo: 'minutos' },
            { valor: params.notas ?? '0', rotulo: 'anotações' },
          ].map((item, i) => (
            <View key={item.rotulo} style={[estilos.numero, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: scheme.borderSoft }]}>
              <Text style={{ fontFamily: fonts.serifSemi, fontSize: 24, lineHeight: 30, color: scheme.accent }}>{item.valor}</Text>
              <Text variant="micro" color={scheme.textMuted}>
                {item.rotulo}
              </Text>
            </View>
          ))}
        </View>

        <View style={estilos.compartilhar}>
          {[
            { icone: 'share-outline' as const, rotulo: 'Compartilhar', acao: compartilhar },
            { icone: 'logo-whatsapp' as const, rotulo: 'WhatsApp', acao: whatsapp },
            { icone: copiado ? ('checkmark' as const) : ('link-outline' as const), rotulo: copiado ? 'Copiado' : 'Copiar', acao: copiar },
          ].map((b) => (
            <Pressable
              key={b.rotulo}
              onPress={() => void b.acao()}
              accessibilityRole="button"
            >
              {({ pressed }) => (
                <View style={[estilos.botaoCompartilhar, pressed && { opacity: 0.7 }]}>
                  <Ionicons name={b.icone} size={16} color={scheme.textSecondary} />
                  <Text variant="micro" font="bodySemi" color={scheme.textSecondary}>
                    {b.rotulo}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {erroCartao ? (
          <Text variant="caption" color={scheme.accent} style={{ textAlign: 'center', marginTop: space.sm }}>
            {erroCartao}
          </Text>
        ) : null}

        {proxima ? (
          <Pressable onPress={seguir} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[estilos.proxima, pressed && { opacity: 0.8 }]}>
                <CapaTrilha cover={proxima.cover} style={estilos.proximaCapa}>
                  {proxima.locked ? (
                    <View style={estilos.proximaCadeado}>
                      <Ionicons name="lock-closed" size={10} color={scheme.gold} />
                    </View>
                  ) : null}
                </CapaTrilha>
                <View style={{ flex: 1 }}>
                  <Overline color={scheme.gold}>Próximo degrau</Overline>
                  <Text style={{ fontFamily: fonts.serifSemi, fontSize: 18, lineHeight: 22, color: scheme.textPrimary, marginTop: 2 }}>
                    {proxima.name}
                  </Text>
                  <Text variant="micro" color={scheme.textMuted} style={{ marginTop: 2 }}>
                    {`${proxima.days_count} dias · ${proxima.tier === 'free' ? 'Grátis' : 'Apoiador'}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={scheme.textGhost} />
              </View>
            )}
          </Pressable>
        ) : null}

        <View style={estilos.escada}>
          {['3 dias', '7 dias', '10 a 14 dias'].map((rotulo, i) => (
            <View key={rotulo} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {i > 0 ? <Ionicons name="chevron-forward" size={11} color={scheme.textGhost} /> : null}
              <Text variant="micro" font="bodySemi" color={i === degrau ? scheme.gold : scheme.textGhost}>
                {i === degrau ? `${rotulo.toUpperCase()} ✓` : rotulo.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label={!proxima ? 'Ver trilhas' : proxima.locked ? 'Seja Apoiador e continue' : 'Começar a próxima'}
          iconLeft={proxima?.locked ? 'ribbon-outline' : undefined}
          icon={proxima?.locked ? undefined : 'arrow-forward'}
          onPress={seguir}
          style={{ marginTop: space.xl, backgroundColor: proxima?.locked ? scheme.gold : scheme.accent }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function criarEstilos(scheme: Scheme) {
  return StyleSheet.create({
    selo: {
      width: 112,
      height: 112,
      borderRadius: 56,
      marginTop: space.lg,
      backgroundColor: scheme.gold,
      borderWidth: 5,
      borderColor: scheme.goldSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numeros: {
      flexDirection: 'row',
      marginTop: space.xl,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    numero: { flex: 1, alignItems: 'center', paddingVertical: space.md },
    compartilhar: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, marginTop: space.lg },
    botaoCompartilhar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 38,
      paddingHorizontal: 13,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    proxima: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      marginTop: space.xl,
      padding: space.md,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    proximaCapa: { width: 62, height: 62, borderRadius: radius.sm },
    proximaCadeado: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: scheme.goldSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    escada: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md },
  });
}
