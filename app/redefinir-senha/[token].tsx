import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import { ApiError } from '../../src/api/types';
import { AccentHalo } from '../../src/components/ornaments';
import { Button, EmptyState, Field, GoldRule, Overline, Text } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeContext';
import { space } from '../../src/theme/tokens';

/**
 * Rota PUBLICA (fora do grupo (auth)), igual a app/r/[token].tsx — alguem
 * abre o link do e-mail sem sessao. Precisa estar em ROTAS_PUBLICAS
 * (app/_layout.tsx) para o RouteGuard nao mandar pro login antes de montar.
 *
 * Mesmas regras de senha de register.tsx, espelhando auth_service.py:33-68.
 */
const REGRAS: { texto: string; ok: (s: string) => boolean }[] = [
  { texto: '8 caracteres', ok: (s) => s.length >= 8 },
  { texto: 'Uma maiúscula', ok: (s) => /[A-Z]/.test(s) },
  { texto: 'Uma minúscula', ok: (s) => /[a-z]/.test(s) },
  { texto: 'Um número', ok: (s) => /[0-9]/.test(s) },
  { texto: 'Um símbolo (!@#$%…)', ok: (s) => /[!@#$%^&*()_+]/.test(s) },
];

function Regra({ texto, atendida }: { texto: string; atendida: boolean }) {
  const { scheme } = useTheme();
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

export default function RedefinirSenha() {
  const { scheme } = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [falha, setFalha] = useState<{ titulo: string; descricao: string } | null>(null);

  const senhaValida = REGRAS.every((r) => r.ok(senha));
  const naoConferem = confirmacao.length > 0 && senha !== confirmacao;
  const completo = senhaValida && confirmacao && !naoConferem;

  async function redefinir() {
    if (!token) return;
    if (!senhaValida) return setErro('A senha ainda não atende aos requisitos.');
    if (senha !== confirmacao) return setErro('As senhas não conferem.');

    setErro(null);
    setCarregando(true);
    try {
      await api.resetPassword({ token, password: senha, confirm_password: confirmacao });
      setSucesso(true);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 410) {
        setFalha({
          titulo: 'Este link expirou',
          descricao: 'Peça um novo link em "Esqueci minha senha".',
        });
      } else if (status === 404) {
        setFalha({ titulo: 'Link inválido', descricao: 'Confira se o endereço está completo.' });
      } else {
        setErro(mensagemDe(e));
      }
    } finally {
      setCarregando(false);
    }
  }

  if (sucesso) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          icone="checkmark-circle-outline"
          titulo="Senha redefinida"
          descricao="Agora você já pode entrar com a sua nova senha."
          acao={
            <Button
              label="Ir para o login"
              icon="arrow-forward"
              onPress={() => router.replace('/(auth)/login')}
            />
          }
        />
      </SafeAreaView>
    );
  }

  if (falha) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <EmptyState
          icone="link-outline"
          titulo={falha.titulo}
          descricao={falha.descricao}
          acao={
            <Button
              label="Esqueci minha senha"
              icon="arrow-forward"
              onPress={() => router.replace('/(auth)/esqueci-senha')}
            />
          }
        />
      </SafeAreaView>
    );
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
              Nova senha
            </Text>
            <GoldRule width={56} style={{ marginTop: space.lg }} />
          </View>

          <View style={{ gap: space.md }}>
            <Field
              value={senha}
              onChangeText={setSenha}
              placeholder="Nova senha"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              editable={!carregando}
            />
            <Field
              value={confirmacao}
              onChangeText={setConfirmacao}
              placeholder="Confirme a nova senha"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              editable={!carregando}
              erro={naoConferem ? 'As senhas não conferem.' : null}
              onSubmitEditing={redefinir}
              returnKeyType="go"
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
            label="Redefinir senha"
            icon="arrow-forward"
            onPress={redefinir}
            loading={carregando}
            disabled={carregando || !completo}
            style={{ marginTop: space.xl }}
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
