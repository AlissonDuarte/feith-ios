import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { isAppleSignInAvailable, signInWithApple } from '../../src/auth/appleSignIn';
import { useAuth } from '../../src/auth/AuthContext';
import { googleSignInAvailable, signInWithGoogle } from '../../src/auth/googleSignIn';
import { Button, Text, scheme } from '../../src/components/ui';
import { radius } from '../../src/theme/tokens';

type Metodo = 'email' | 'google' | 'apple' | null;

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<Metodo>(null);

  // A disponibilidade do Sign in with Apple e uma pergunta de runtime (iOS 13+),
  // nao uma env var como a do Google.
  const [appleDisponivel, setAppleDisponivel] = useState(false);
  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleDisponivel);
  }, []);

  async function entrar(metodo: Metodo, executar: () => Promise<void>) {
    setErro(null);
    setCarregando(metodo);
    try {
      await executar();
      router.replace('/(tabs)/hoje');
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setCarregando(null);
    }
  }

  const comEmail = () =>
    entrar('email', async () => {
      const resposta = await api.login({ email: email.trim(), password: senha });
      await signIn(resposta);
    });

  const comGoogle = () =>
    entrar('google', async () => {
      const idToken = await signInWithGoogle();
      // Cancelar nao e erro: sai em silencio.
      if (!idToken) return;
      await signIn(await api.googleLogin(idToken));
    });

  const comApple = () =>
    entrar('apple', async () => {
      const credencial = await signInWithApple();
      if (!credencial) return;
      const { identityToken, ...perfil } = credencial;
      await signIn(await api.appleLogin(identityToken, perfil));
    });

  const ocupado = carregando !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="display" display weight="bold">
            feith
          </Text>
          <Text variant="body" color={scheme.textSecondary} style={{ marginTop: 6 }}>
            Exegese diária para quem leva a fé a sério.
          </Text>

          <View style={{ marginTop: 36, gap: 12 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              editable={!ocupado}
              style={estiloCampo}
            />
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              editable={!ocupado}
              onSubmitEditing={comEmail}
              returnKeyType="go"
              style={estiloCampo}
            />
          </View>

          {erro ? (
            <Text variant="caption" color="#E11D48" style={{ marginTop: 12 }}>
              {erro}
            </Text>
          ) : null}

          <Button
            label="Entrar"
            onPress={comEmail}
            loading={carregando === 'email'}
            disabled={ocupado || !email || !senha}
            style={{ marginTop: 20 }}
          />

          {/* O botao do Google so aparece com os dois client IDs configurados:
              melhor nenhum botao do que um que so falharia ao ser tocado. */}
          {googleSignInAvailable ? (
            <Button
              label="Continuar com o Google"
              variant="secondary"
              onPress={comGoogle}
              loading={carregando === 'google'}
              disabled={ocupado}
              style={{ marginTop: 10 }}
            />
          ) : null}

          {/* Obrigatorio pela Guideline 4.8 sempre que ha login social de
              terceiro. A disponibilidade e decidida pelo sistema. */}
          {appleDisponivel ? (
            <Button
              label="Continuar com a Apple"
              variant="secondary"
              onPress={comApple}
              loading={carregando === 'apple'}
              disabled={ocupado}
              style={{ marginTop: 10 }}
            />
          ) : null}

          <Link href="/(auth)/register" asChild>
            <Button label="Criar uma conta" variant="ghost" disabled={ocupado} style={{ marginTop: 16 }} />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estiloCampo = {
  minHeight: 52,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: scheme.border,
  backgroundColor: scheme.surface,
  paddingHorizontal: 16,
  fontFamily: 'Inter_400Regular',
  fontSize: 17,
  color: scheme.textPrimary,
} as const;
