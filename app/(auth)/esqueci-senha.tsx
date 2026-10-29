import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { AccentHalo } from '../../src/components/ornaments';
import { Button, Field, GoldRule, Overline, Text } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeContext';
import { space } from '../../src/theme/tokens';

/**
 * A resposta de POST /users/forgot-password e sempre a mesma, exista ou nao
 * a conta (protecao contra enumeracao no backend). Esta tela espelha isso: o
 * estado de sucesso nunca diz "enviamos" vs "nao encontramos", so o texto
 * generico abaixo.
 */
export default function EsqueciSenha() {
  const { scheme } = useTheme();

  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setErro(null);
    setCarregando(true);
    try {
      await api.forgotPassword({ email: email.trim() });
      setEnviado(true);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
      <AccentHalo height={320} opacity={0.7} />

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
          <View style={{ alignItems: 'center', marginBottom: space.section }}>
            <Overline color={scheme.accent}>Recuperar acesso</Overline>
            <Text variant="hero" style={{ marginTop: space.md, textAlign: 'center' }}>
              Esqueceu sua senha?
            </Text>
            <GoldRule width={56} style={{ marginTop: space.lg }} />
            <Text
              variant="bodySm"
              color={scheme.textSecondary}
              style={{ textAlign: 'center', marginTop: space.md, maxWidth: 280 }}
            >
              Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
            </Text>
          </View>

          {enviado ? (
            <Text
              variant="bodySm"
              color={scheme.textSecondary}
              style={{ textAlign: 'center' }}
            >
              Se existir uma conta com este e-mail, enviamos um link de redefinição. Confira sua
              caixa de entrada.
            </Text>
          ) : (
            <>
              <Field
                value={email}
                onChangeText={setEmail}
                placeholder="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                editable={!carregando}
                onSubmitEditing={enviar}
                returnKeyType="go"
              />

              {erro ? (
                <Text variant="caption" color={scheme.accent} style={{ marginTop: space.md }}>
                  {erro}
                </Text>
              ) : null}

              <Button
                label="Enviar link"
                icon="arrow-forward"
                onPress={enviar}
                loading={carregando}
                disabled={carregando || !email}
                style={{ marginTop: space.xl }}
              />
            </>
          )}

          <Link href="/(auth)/login" asChild>
            <Button
              label="Voltar para o login"
              variant="ghost"
              style={{ marginTop: space.xl, alignSelf: 'center' }}
            />
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
