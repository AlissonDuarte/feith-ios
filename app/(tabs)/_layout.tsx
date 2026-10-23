import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
// `expo-router/js-tabs` e nao `expo-router`: no SDK 57 o `Tabs` da raiz esta
// marcado como deprecado (build/exports.d.ts:41) em favor deste ponto de
// entrada. Mesmo componente, mesmas opcoes — so o import muda.
import { Tabs } from 'expo-router/js-tabs';
import { Platform, StyleSheet, View, type ColorValue } from 'react-native';

import { useTourTarget } from '../../src/onboarding/TourTargets';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/tokens';

/**
 * Icone da tab, envolto num View com ref registrado no TourTargets — e o que
 * deixa um onboarding guiado (FeatureWalkthrough) apontar pra uma aba
 * especifica (ex.: "olha, agora tem Trilhas") sem depender de nada interno
 * do `expo-router/js-tabs`. So funciona como componente de verdade (JSX),
 * nunca chamado como funcao solta: e isso que garante que o hook de dentro
 * (useTourTarget) rode com uma fiber propria e estavel.
 */
function TabIcon({
  target,
  name,
  focusedName,
  color,
  size,
  focused,
}: {
  target: string;
  name: keyof typeof Ionicons.glyphMap;
  focusedName: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  const ref = useTourTarget(target);
  return (
    <View ref={ref}>
      <Ionicons name={focused ? focusedName : name} color={color} size={size} />
    </View>
  );
}

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
  const { scheme, effectiveMode } = useTheme();

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
              tint={effectiveMode === 'dark' ? 'dark' : 'light'}
              intensity={80}
              style={StyleSheet.absoluteFill}
            >
              {/* Veu da cor de superficie por cima do blur: sem ele o vidro
                  puxa para o cinza-azulado do sistema e briga com o papel
                  das telas. `surfaceGlass` ja e essa mesma cor com alpha,
                  claro ou escuro. */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: scheme.surfaceGlass }]} />
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
            <TabIcon target="tab_hoje" name="book-outline" focusedName="book" color={color} size={size - 1} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trilhas"
        options={{
          title: 'Trilhas',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon target="tab_trilhas" name="trail-sign-outline" focusedName="trail-sign" color={color} size={size - 1} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="caderno"
        options={{
          title: 'Caderno',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon target="tab_caderno" name="document-text-outline" focusedName="document-text" color={color} size={size - 1} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon target="tab_historico" name="time-outline" focusedName="time" color={color} size={size - 1} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon target="tab_perfil" name="person-outline" focusedName="person" color={color} size={size - 1} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
