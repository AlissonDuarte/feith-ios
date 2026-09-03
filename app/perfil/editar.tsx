import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { UserProfile } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, Text, scheme } from '../../src/components/ui';
import { radius } from '../../src/theme/tokens';

type Genero = 'male' | 'female' | 'other';

const GENEROS: { valor: Genero; rotulo: string }[] = [
  { valor: 'female', rotulo: 'Feminino' },
  { valor: 'male', rotulo: 'Masculino' },
  { valor: 'other', rotulo: 'Outro' },
];

/**
 * `birth_date` e uma String no banco, sem formato imposto (models.py). A web
 * grava o valor cru de um `<input type="date">`, que e ISO `aaaa-mm-dd` —
 * entao e esse o formato que persistimos, para os dois clientes lerem a mesma
 * coisa. O que a pessoa VE continua em dd/mm/aaaa.
 */
function isoParaData(iso?: string | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dataParaIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function exibirData(d: Date | null): string {
  if (!d) return 'Não informada';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function EditarPerfil() {
  const router = useRouter();
  const { refreshSummary } = useAuth();

  // O perfil COMPLETO e buscado aqui, e nao guardado no AuthContext: data de
  // nascimento e genero so interessam a esta tela, e mante-los no contexto
  // faria toda tela carregar dados que nao usa.
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [nascimento, setNascimento] = useState<Date | null>(null);
  const [genero, setGenero] = useState<Genero | ''>('');
  const [mostrandoPicker, setMostrandoPicker] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        setPerfil(p);
        setUsername(p.username ?? '');
        setNascimento(isoParaData(p.birth_date));
        setGenero((p.gender as Genero) || '');
      })
      .catch((e) => setErro(mensagemDe(e)))
      .finally(() => setCarregando(false));
  }, []);

  function escolherGenero() {
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...GENEROS.map((g) => g.rotulo), 'Cancelar'],
        cancelButtonIndex: GENEROS.length,
        title: 'Gênero',
      },
      (i) => {
        if (i < GENEROS.length) setGenero(GENEROS[i].valor);
      },
    );
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      // Envia so o que mudou. O PATCH aceita parcial, e mandar o objeto
      // inteiro sobrescreveria o notification_schedule com o valor carregado
      // aqui — que pode estar velho se a outra tela o alterou.
      const patch: Partial<UserProfile> = {};
      if (username.trim() && username.trim() !== perfil?.username) {
        patch.username = username.trim();
      }
      if (nascimento) patch.birth_date = dataParaIso(nascimento);
      if (genero) patch.gender = genero;

      if (Object.keys(patch).length === 0) return router.back();

      const atualizado = await api.updateProfile(patch);
      setPerfil(atualizado);
      void refreshSummary();
      router.back();
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }}>
        <View style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const rotuloGenero = GENEROS.find((g) => g.valor === genero)?.rotulo ?? 'Não informado';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text variant="caption" weight="semi" color={scheme.textSecondary}>
            NOME DE USUÁRIO
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!salvando}
            style={campo}
          />
        </View>

        <View>
          <Text variant="caption" weight="semi" color={scheme.textSecondary}>
            DATA DE NASCIMENTO
          </Text>
          <Pressable onPress={() => setMostrandoPicker(true)} disabled={salvando}>
            <View style={[campo, { justifyContent: 'center' }]}>
              <Text variant="body" color={nascimento ? scheme.textPrimary : scheme.textMuted}>
                {exibirData(nascimento)}
              </Text>
            </View>
          </Pressable>
        </View>

        {mostrandoPicker ? (
          <Card>
            <DateTimePicker
              value={nascimento ?? new Date(1990, 0, 1)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              locale="pt-BR"
              onChange={(_, d) => {
                if (d) setNascimento(d);
                if (Platform.OS !== 'ios') setMostrandoPicker(false);
              }}
            />
            <Button label="Pronto" variant="secondary" onPress={() => setMostrandoPicker(false)} />
          </Card>
        ) : null}

        <View>
          <Text variant="caption" weight="semi" color={scheme.textSecondary}>
            GÊNERO
          </Text>
          <Pressable onPress={escolherGenero} disabled={salvando}>
            <View style={[campo, { justifyContent: 'center' }]}>
              <Text variant="body" color={genero ? scheme.textPrimary : scheme.textMuted}>
                {rotuloGenero}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text variant="caption" color={scheme.textMuted}>
          O e-mail ({perfil?.email}) não pode ser alterado por aqui.
        </Text>

        {erro ? (
          <Text variant="caption" color="#E11D48">
            {erro}
          </Text>
        ) : null}

        <Button
          label="Salvar"
          onPress={salvar}
          loading={salvando}
          disabled={salvando}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const campo = {
  minHeight: 52,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: scheme.border,
  backgroundColor: scheme.surface,
  paddingHorizontal: 16,
  marginTop: 8,
  fontFamily: 'Inter_400Regular',
  fontSize: 17,
  color: scheme.textPrimary,
} as const;
