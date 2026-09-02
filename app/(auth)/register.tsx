import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Text, scheme } from '../../src/components/ui';
import { radius } from '../../src/theme/tokens';

/**
 * As regras de senha sao validadas pelo backend (auth_service.py:33-68) e
 * espelhadas aqui. Deixar o servidor ser o unico juiz custaria uma ida a rede
 * por tentativa e devolveria a mensagem em ingles.
 */
function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra maiúscula.';
  if (!/[a-z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra minúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter pelo menos um número.';
  if (!/[!@#$%^&*()_+]/.test(senha)) {
    return 'A senha precisa ter pelo menos um caractere especial (!@#$%^&*()_+).';
  }
  return null;
}

export default function Register() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function criar() {
    const problema = validarSenha(senha);
    if (problema) return setErro(problema);
    if (senha !== confirmacao) return setErro('As senhas não conferem.');

    setErro(null);
    setCarregando(true);
    try {
      await api.register({
        username: username.trim(),
        email: email.trim(),
        password: senha,
        confirm_password: confirmacao,
        // O backend exige os dois campos (user_schemas.py:5-12), mas nenhum e
        // necessario para ler um devocional — e coletar dado sem necessidade e
        // questionamento certo na App Review (5.1.1). Enviamos vazio ate o
        // backend torna-los opcionais; a tela nao os pede.
        birth_date: '',
        gender: 'other',
      });

      // O registro nao devolve sessao; entra em seguida com as credenciais.
      await signIn(await api.login({ email: email.trim(), password: senha }));
      router.replace('/(tabs)/hoje');
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setCarregando(false);
    }
  }

  const completo = username && email && senha && confirmacao;

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
            Criar conta
          </Text>

          <View style={{ marginTop: 28, gap: 12 }}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Nome de usuário"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              editable={!carregando}
              style={estiloCampo}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              editable={!carregando}
              style={estiloCampo}
            />
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              secureTextEntry
              editable={!carregando}
              style={estiloCampo}
            />
            <TextInput
              value={confirmacao}
              onChangeText={setConfirmacao}
              placeholder="Confirme a senha"
              placeholderTextColor={scheme.textMuted}
              autoCapitalize="none"
              secureTextEntry
              editable={!carregando}
              style={estiloCampo}
            />
          </View>

          <Text variant="caption" color={scheme.textMuted} style={{ marginTop: 12 }}>
            Mínimo de 8 caracteres, com maiúscula, minúscula, número e um símbolo.
          </Text>

          {erro ? (
            <Text variant="caption" color="#E11D48" style={{ marginTop: 12 }}>
              {erro}
            </Text>
          ) : null}

          <Button
            label="Criar conta"
            onPress={criar}
            loading={carregando}
            disabled={carregando || !completo}
            style={{ marginTop: 20 }}
          />
          <Button
            label="Já tenho conta"
            variant="ghost"
            onPress={() => router.back()}
            disabled={carregando}
            style={{ marginTop: 12 }}
          />
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
