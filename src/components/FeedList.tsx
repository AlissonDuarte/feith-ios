/**
 * A lista dos tres feeds: Anotacoes, Favoritos e Historico.
 *
 * Na web sao tres componentes quase iguais (BookmarkedFeed, NotesFeed,
 * HistoryFeed), cada um com sua paginacao por botoes. Aqui e um so, com
 * scroll infinito, busca, pull-to-refresh, skeleton na primeira carga e
 * estados vazios distintos para "nao ha nada" e "a busca nao achou".
 */
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TextInput,
  View,
} from 'react-native';

import type { ListaPaginada } from '../hooks/useListaPaginada';
import { radius } from '../theme/tokens';
import { Button, Card, EmptyState, Text, scheme } from './ui';

interface FeedListProps<T> {
  lista: ListaPaginada<T>;
  chave: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  /** Placeholder do campo de busca. Ausente = feed sem busca. */
  placeholderBusca?: string;
  tituloVazio: string;
  descricaoVazia?: string;
  /** Mostrado acima da lista — usado pelo aviso de janela do plano gratuito. */
  cabecalho?: React.ReactElement | null;
}

/** Bloco cinza no formato aproximado de um card, para a primeira carga. */
function Skeleton() {
  return (
    <Card style={{ marginBottom: 12, opacity: 0.5 }}>
      <View style={{ height: 12, width: '40%', backgroundColor: scheme.border, borderRadius: 6 }} />
      <View
        style={{
          height: 10,
          width: '90%',
          backgroundColor: scheme.border,
          borderRadius: 5,
          marginTop: 14,
        }}
      />
      <View
        style={{
          height: 10,
          width: '65%',
          backgroundColor: scheme.border,
          borderRadius: 5,
          marginTop: 8,
        }}
      />
    </Card>
  );
}

export function FeedList<T>({
  lista,
  chave,
  renderItem,
  placeholderBusca,
  tituloVazio,
  descricaoVazia,
  cabecalho,
}: FeedListProps<T>) {
  const {
    itens,
    carregando,
    atualizando,
    carregandoMais,
    erro,
    busca,
    setBusca,
    recarregar,
    carregarMais,
  } = lista;

  const buscando = busca.trim().length > 0;

  const campoBusca = useMemo(() => {
    if (!placeholderBusca) return null;
    return (
      <TextInput
        value={busca}
        onChangeText={setBusca}
        placeholder={placeholderBusca}
        placeholderTextColor={scheme.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          minHeight: 44,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: scheme.border,
          backgroundColor: scheme.surface,
          paddingHorizontal: 14,
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          color: scheme.textPrimary,
          marginBottom: 16,
        }}
      />
    );
  }, [placeholderBusca, busca, setBusca]);

  // Erro sem nada em tela: a lista inteira vira o erro. Erro com itens ja
  // carregados nao apaga o que a pessoa esta lendo — vira so o rodape.
  if (erro && itens.length === 0 && !carregando) {
    return (
      <View style={{ flex: 1 }}>
        {campoBusca ? <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>{campoBusca}</View> : null}
        <EmptyState
          titulo="Não foi possível carregar"
          descricao={erro}
          acao={<Button label="Tentar de novo" onPress={() => void recarregar()} />}
        />
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        {campoBusca}
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </View>
    );
  }

  return (
    <FlatList
      data={itens}
      keyExtractor={chave}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 48,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <>
          {campoBusca}
          {cabecalho}
        </>
      }
      ListEmptyComponent={
        buscando ? (
          <EmptyState
            titulo="Nada encontrado"
            descricao={`Nenhum resultado para “${busca.trim()}”.`}
          />
        ) : (
          <EmptyState titulo={tituloVazio} descricao={descricaoVazia} />
        )
      }
      ListFooterComponent={
        carregandoMais ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator color={scheme.accent} />
          </View>
        ) : erro && itens.length > 0 ? (
          <Text
            variant="caption"
            color={scheme.textMuted}
            style={{ textAlign: 'center', paddingVertical: 24 }}
          >
            {erro}
          </Text>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => void recarregar()}
          tintColor={scheme.accent}
        />
      }
      onEndReached={carregarMais}
      // 0.5 e nao 0.1: puxar a proxima pagina meia tela antes do fim faz o
      // scroll parecer continuo em vez de travar e retomar.
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}
