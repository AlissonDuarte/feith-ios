import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
// `expo-router/js-tabs` e nao `expo-router`: no SDK 57 o `Tabs` da raiz esta
// marcado como deprecado (build/exports.d.ts:41) em favor deste ponto de
// entrada. Mesmo componente, mesmas opcoes — so o import muda.
import { Tabs } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { fonts, schemes } from '../../src/theme/tokens';

/**
 * Tab bar com os mesmos 5 destinos do Sidebar.svelte:99-105 da web.
 *
 * O rail de 72px que colapsa, os tooltips de hover e o dialogo de logout
 * customizado nao vem junto — nada disso existe num iPhone. O badge de streak
 * do sidebar vai para a header da Hoje, e o bloco de usuario e plano vai para
 * o Perfil.
 *
 * Duas escolhas visuais que sustentam o resto do app:
 *
 * 1. A barra e TRANSLUCIDA (BlurView), com o conteudo passando por baixo. E o
 *    comportamento nativo do iOS, e num app de leitura ele importa: uma barra
 *    opaca corta a coluna de texto com uma faixa branca e encurta a pagina.
 * 2. Icone preenchido quando ativo, contornado quando nao. So a cor mudando
 *    (oxblood sobre cinza) e um sinal fraco em icones de 24px.
 */
export default function TabsLayout() {
  const scheme = schemes.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: scheme.accent,
        tabBarInactiveTintColor: scheme.textMuted,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: scheme.border,
          // O blur so aparece se o fundo proprio for transparente; no Android,
          // onde o BlurView e uma aproximacao, mantemos o creme solido.
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : scheme.canvas,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint="light"
              intensity={80}
              style={StyleSheet.absoluteFill}
            >
              {/* Veu creme por cima do blur: sem ele o vidro puxa para o
                  cinza-azulado do sistema e briga com o papel das telas. */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(250,248,244,0.72)' }]} />
            </BlurView>
          ) : null,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 10,
          letterSpacing: 0.6,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="hoje"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={size - 1} />
          ),
        }}
      />
      <Tabs.Screen
        name="anotacoes"
        options={{
          title: 'Anotações',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color}
              size={size - 1}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'bookmark' : 'bookmark-outline'}
              color={color}
              size={size - 1}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} color={color} size={size - 1} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size - 1} />
          ),
        }}
      />
    </Tabs>
  );
}
