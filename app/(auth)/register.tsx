import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { useAuth } from '../../src/auth/AuthContext';
import { AccentHalo } from '../../src/components/ornaments';
import { Button, Field, GoldRule, Overline, Text, scheme } from '../../src/components/ui';
import { space } from '../../src/theme/tokens';

/**
 * As regras de senha sao validadas pelo backend (auth_service.py:33-68) e
 * espelhadas aqui. Deixar o servidor ser o unico juiz custaria uma ida a rede
 * por tentativa e devolveria a mensagem em ingles.
 *
 * Mostradas como lista que se marca sozinha enquanto a pessoa digita, e nao
 * como um erro depois do envio: cinco regras reveladas uma por vez, a cada
 * tentativa recusada, e a forma mais rapida de perder um cadastro.
 */
const REGRAS: { texto: string; ok: (s: string) => boolean }[] = [
  { texto: '8 caracteres', ok: (s) => s.length >= 8 },
  { texto: 'Uma maiúscula', ok: (s) => /[A-Z]/.test(s) },
  { texto: 'Uma minúscula', ok: (s) => /[a-z]/.test(s) },
  { texto: 'Um número', ok: (s) => /[0-9]/.test(s) },
  { texto: 'Um símbolo (!@#$%…)', ok: (s) => /[!@#$%^&*()_+]/.test(s) },
];

function Regra({ texto, atendida }: { texto: string; atendida: boolean }) {
  return (
    <View style={estilos.regra}>
      <Ionicons
        name={atendida ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={atendida ? scheme.gold : scheme.textGhost}
      />
      <Text variant="caption" color={atendida ? scheme.textSecondary : scheme.textGhost}>
        {texto}
      </Text>
    </View>
  );
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

  const senhaValida = REGRAS.every((r) => r.ok(senha));
  const naoConferem = confirmacao.length > 0 && senha !== confirmacao;

  async function criar() {
    if (!senhaValida) return setErro('A senha ainda não atende aos requisitos.');
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

  const completo = username && email && senhaValida && confirmacao && !naoConferem;

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
            <Overline color={scheme.accent}>Comece hoje</Overline>
            <Text variant="hero" style={{ marginTop: space.md, textAlign: 'center' }}>
              Criar conta
            </Text>
            <GoldRule width={56} style={{ marginTop: space.lg }} />
          </View>

          <View style={{ gap: space.md }}>
            <Field
              value={username}
              onChangeText={setUsername}
              placeholder="Nome de usuário"
              autoCapitalize="none"
              autoComplete="username"
              editable={!carregando}
            />
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              editable={!carregando}
            />
            <Field
              value={senha}
              onChangeText={setSenha}
              placeholder="Senha"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              editable={!carregando}
            />
            <Field
              value={confirmacao}
              onChangeText={setConfirmacao}
              placeholder="Confirme a senha"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              editable={!carregando}
              erro={naoConferem ? 'As senhas não conferem.' : null}
            />
          </View>

          <View style={estilos.regras}>
            {REGRAS.map((r) => (
              <Regra key={r.texto} texto={r.texto} atendida={r.ok(senha)} />
            ))}
          </View>

          {erro ? (
            <Text variant="caption" color={scheme.accent} style={{ marginTop: space.md }}>
              {erro}
            </Text>
          ) : null}

          <Button
            label="Criar conta"
            icon="arrow-forward"
            onPress={criar}
            loading={carregando}
            disabled={carregando || !completo}
            style={{ marginTop: space.xl }}
          />
          <Button
            label="Já tenho conta"
            variant="ghost"
            onPress={() => router.back()}
            disabled={carregando}
            style={{ marginTop: space.md, alignSelf: 'center' }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  regras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    marginTop: space.lg,
  },
  regra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
