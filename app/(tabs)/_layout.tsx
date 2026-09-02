import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { fonts, schemes } from '../../src/theme/tokens';

/**
 * Tab bar com os mesmos 5 destinos do Sidebar.svelte:99-105 da web.
 *
 * O rail de 72px que colapsa, os tooltips de hover e o dialogo de logout
 * customizado nao vem junto — nada disso existe num iPhone. O badge de streak
 * do sidebar vai para a header da Hoje, e o bloco de usuario e plano vai para
 * o Perfil.
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
          backgroundColor: scheme.surface,
          borderTopColor: scheme.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="hoje"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="anotacoes"
        options={{
          title: 'Anotações',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => <Ionicons name="star" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
