import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { api } from '../src/api/client';
import { mensagemDe } from '../src/api/errors';
import { isAppleSignInAvailable, signInWithApple } from '../src/auth/appleSignIn';
import { useAuth } from '../src/auth/AuthContext';
import { googleSignInAvailable, signInWithGoogle } from '../src/auth/googleSignIn';
import { AppleButton, GoogleButton } from '../src/components/SocialAuth';
import { Button, Text } from '../src/components/ui';
import { posthog } from '../src/config/posthog';
import { useTheme } from '../src/theme/ThemeContext';
import { space } from '../src/theme/tokens';

type Metodo = 'google' | 'apple' | null;

export default function Conta() {
  const { scheme } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [appleDisponivel, setAppleDisponivel] = useState(false);
  const [carregando, setCarregando] = useState<Metodo>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleDisponivel);
    posthog?.capture('guest_account_prompt_viewed');
  }, []);

  async function entrar(metodo: Metodo, executar: () => Promise<boolean>) {
    setErro(null);
    setCarregando(metodo);
    try {
      if (await executar()) router.back();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setCarregando(null);
    }
  }

  const comApple = () =>
    entrar('apple', async () => {
      const credencial = await signInWithApple();
      if (!credencial) return false;
      const { identityToken, ...perfil } = credencial;
      await signIn(await api.appleLogin(identityToken, perfil));
      return true;
    });

  const comGoogle = () =>
    entrar('google', async () => {
      const idToken = await signInWithGoogle();
      if (!idToken) return false;
      await signIn(await api.googleLogin(idToken));
      return true;
    });

  const ocupado = carregando !== null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.surface }}
      contentContainerStyle={{ padding: space.gutter, paddingTop: space.xxl }}
    >
      <Text variant="display" accessibilityRole="header">
        Guarde o que você começou
      </Text>
      <Text color={scheme.textSecondary} style={{ fontSize: 16, lineHeight: 25, marginTop: space.sm }}>
        Com uma conta, sua sequência, suas anotações e seus favoritos ficam salvos, mesmo se você trocar de celular.
      </Text>

      <View style={{ gap: 10, marginTop: space.xl }}>
        {appleDisponivel ? (
          <AppleButton onPress={comApple} loading={carregando === 'apple'} disabled={ocupado} />
        ) : null}
        {googleSignInAvailable ? (
          <GoogleButton onPress={comGoogle} loading={carregando === 'google'} disabled={ocupado} />
        ) : null}
        <Button
          label="Continuar com e-mail"
          variant="quiet"
          iconLeft="mail-outline"
          disabled={ocupado}
          onPress={() => router.replace('/(auth)/register')}
        />
      </View>

      {erro ? (
        <Text variant="caption" color={scheme.accent} style={{ marginTop: space.md, textAlign: 'center' }}>
          {erro}
        </Text>
      ) : null}

      <Button
        label="Agora não"
        variant="ghost"
        textColor={scheme.accent}
        disabled={ocupado}
        onPress={() => {
          posthog?.capture('guest_account_prompt_dismissed');
          router.back();
        }}
        style={{ alignSelf: 'center', marginTop: space.md }}
      />
      <Text variant="micro" color={scheme.textMuted} style={{ textAlign: 'center', marginTop: space.sm }}>
        Ao continuar, você aceita os Termos e a Política de Privacidade.
      </Text>
    </ScrollView>
  );
}
