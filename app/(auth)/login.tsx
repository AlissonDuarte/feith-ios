import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { isAppleSignInAvailable, signInWithApple } from '../../src/auth/appleSignIn';
import { useAuth } from '../../src/auth/AuthContext';
import { googleSignInAvailable, signInWithGoogle } from '../../src/auth/googleSignIn';
import { AccentHalo } from '../../src/components/ornaments';
import { Button, Field, GoldRule, Overline, Text, scheme } from '../../src/components/ui';
import { fonts, space } from '../../src/theme/tokens';

type Metodo = 'email' | 'google' | 'apple' | null;

/**
 * Separador "ou" entre o login por e-mail e os provedores.
 *
 * Sem ele os cinco botoes empilhados parecem cinco alternativas de igual peso;
 * com ele fica claro que ha um caminho principal e dois atalhos.
 */
function Separador({ children }: { children: string }) {
  return (
    <View style={estilos.separador}>
      <View style={estilos.fio} />
      <Text variant="overline" color={scheme.textGhost} style={{ textTransform: 'uppercase' }}>
        {children}
      </Text>
      <View style={estilos.fio} />
    </View>
  );
}

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
      <AccentHalo height={420} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 28,
            paddingVertical: space.section,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Frontispicio ────────────────────────────────────────────
              A mesma abertura do hero da landing: etiqueta espacada, marca em
              serifada leve, fio de ouro, promessa. E a unica tela que a pessoa
              ve antes de decidir se o produto e serio. */}
          <View style={{ alignItems: 'center', marginBottom: space.section }}>
            <Overline color={scheme.accent}>Exegese diária</Overline>

            <Text style={estilos.marca}>feith</Text>

            <GoldRule width={72} style={{ marginTop: space.lg }} />

            <Text
              variant="bodySm"
              color={scheme.textSecondary}
              style={{ textAlign: 'center', marginTop: space.xl, maxWidth: 280 }}
            >
              A Escritura merece mais do que uma leitura superficial.
            </Text>
          </View>

          <View style={{ gap: space.md }}>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              editable={!ocupado}
            />
            <Field
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              editable={!ocupado}
              onSubmitEditing={comEmail}
              returnKeyType="go"
            />
          </View>

          {erro ? (
            <Text variant="caption" color={scheme.accent} style={{ marginTop: space.md }}>
              {erro}
            </Text>
          ) : null}

          <Button
            label="Entrar"
            icon="arrow-forward"
            onPress={comEmail}
            loading={carregando === 'email'}
            disabled={ocupado || !email || !senha}
            style={{ marginTop: space.xl }}
          />

          {googleSignInAvailable || appleDisponivel ? <Separador>ou</Separador> : null}

          {/* O botao do Google so aparece com os dois client IDs configurados:
              melhor nenhum botao do que um que so falharia ao ser tocado. */}
          {googleSignInAvailable ? (
            <Button
              label="Continuar com o Google"
              iconLeft="logo-google"
              variant="secondary"
              onPress={comGoogle}
              loading={carregando === 'google'}
              disabled={ocupado}
            />
          ) : null}

          {/* Obrigatorio pela Guideline 4.8 sempre que ha login social de
              terceiro. A disponibilidade e decidida pelo sistema. */}
          {appleDisponivel ? (
            <Button
              label="Continuar com a Apple"
              iconLeft="logo-apple"
              variant="secondary"
              onPress={comApple}
              loading={carregando === 'apple'}
              disabled={ocupado}
              style={{ marginTop: space.md }}
            />
          ) : null}

          <Link href="/(auth)/register" asChild>
            <Button
              label="Ainda não tenho conta"
              variant="ghost"
              disabled={ocupado}
              style={{ marginTop: space.xl, alignSelf: 'center' }}
            />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  marca: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 64,
    letterSpacing: -1,
    color: scheme.textPrimary,
    marginTop: space.md,
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: space.xxl,
  },
  fio: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: scheme.border,
  },
});
