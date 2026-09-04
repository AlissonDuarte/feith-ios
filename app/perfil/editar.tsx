import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../src/api/client';
import { mensagemDe } from '../../src/api/errors';
import type { UserProfile } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { Button, Card, Field, Loading, Overline, Text, scheme } from '../../src/components/ui';
import { radius, space } from '../../src/theme/tokens';

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

/**
 * Campo que abre um seletor em vez de aceitar digitacao.
 *
 * Mesma altura e mesmo fio do `Field`, com o chevron dizendo que ha algo a
 * escolher — sem ele, um campo que nao aceita o teclado parece um campo
 * desativado.
 */
function CampoSeletor({
  label,
  valor,
  vazio,
  onPress,
  disabled,
}: {
  label: string;
  valor: string;
  vazio: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View>
      <Overline style={{ marginBottom: space.sm }}>{label}</Overline>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valor}`}
        style={({ pressed }) => [estilos.seletor, pressed && { borderColor: scheme.accent }]}
      >
        <Text variant="body" color={vazio ? scheme.textGhost : scheme.textPrimary}>
          {valor}
        </Text>
        <Ionicons name="chevron-down" size={15} color={scheme.textGhost} />
      </Pressable>
    </View>
  );
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
        <Loading />
      </SafeAreaView>
    );
  }

  const rotuloGenero = GENEROS.find((g) => g.valor === genero)?.rotulo ?? 'Não informado';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: scheme.canvas }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, gap: space.xl, paddingBottom: space.section }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field
          label="Nome de usuário"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
          editable={!salvando}
        />

        <CampoSeletor
          label="Data de nascimento"
          valor={exibirData(nascimento)}
          vazio={!nascimento}
          onPress={() => setMostrandoPicker(true)}
          disabled={salvando}
        />

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
            <Button
              label="Pronto"
              variant="secondary"
              size="sm"
              onPress={() => setMostrandoPicker(false)}
            />
          </Card>
        ) : null}

        <CampoSeletor
          label="Gênero"
          valor={rotuloGenero}
          vazio={!genero}
          onPress={escolherGenero}
          disabled={salvando}
        />

        <Text variant="caption" color={scheme.textGhost}>
          O e-mail ({perfil?.email}) não pode ser alterado por aqui.
        </Text>

        {erro ? (
          <Text variant="caption" color={scheme.accent}>
            {erro}
          </Text>
        ) : null}

        <Button label="Salvar" onPress={salvar} loading={salvando} disabled={salvando} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: scheme.border,
    backgroundColor: scheme.surface,
    paddingHorizontal: 16,
  },
});
