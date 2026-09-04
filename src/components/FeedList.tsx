/**
 * A lista dos tres feeds: Anotacoes, Favoritos e Historico.
 *
 * Na web sao tres componentes quase iguais (BookmarkedFeed, NotesFeed,
 * HistoryFeed), cada um com sua paginacao por botoes. Aqui e um so, com
 * scroll infinito, busca, pull-to-refresh, esqueleto na primeira carga e
 * estados vazios distintos para "nao ha nada" e "a busca nao achou".
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, TextInput, View } from 'react-native';

import type { ListaPaginada } from '../hooks/useListaPaginada';
import { fonts, radius, space } from '../theme/tokens';
import { Button, Card, EmptyState, Text, scheme, useEspacoTabBar } from './ui';

interface FeedListProps<T> {
  lista: ListaPaginada<T>;
  chave: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  /** Placeholder do campo de busca. Ausente = feed sem busca. */
  placeholderBusca?: string;
  tituloVazio: string;
  descricaoVazia?: string;
  /** Icone do estado vazio. */
  iconeVazio?: keyof typeof Ionicons.glyphMap;
  /** Mostrado acima da lista — usado pelo aviso de janela do plano gratuito. */
  cabecalho?: React.ReactElement | null;
}

/**
 * Esqueleto da primeira carga.
 *
 * Barras no formato aproximado do card real, e nao um spinner: o esqueleto diz
 * o que vai chegar, e a tela nao "pula" quando o conteudo entra.
 */
function Esqueleto() {
  return (
    <Card style={{ marginBottom: space.md, opacity: 0.6 }}>
      <View style={{ height: 14, width: '46%', backgroundColor: scheme.borderSoft, borderRadius: 3 }} />
      <View
        style={{
          height: 10,
          width: '92%',
          backgroundColor: scheme.borderSoft,
          borderRadius: 3,
          marginTop: 16,
        }}
      />
      <View
        style={{
          height: 10,
          width: '68%',
          backgroundColor: scheme.borderSoft,
          borderRadius: 3,
          marginTop: 9,
        }}
      />
    </Card>
  );
}

/**
 * Campo de busca.
 *
 * Com a lupa dentro do campo, e nao so um placeholder: sem o icone, um campo
 * de texto no topo de uma lista le como "escreva algo aqui", nao como "busque".
 */
function CampoBusca({
  valor,
  aoMudar,
  placeholder,
}: {
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 46,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: scheme.border,
        backgroundColor: scheme.surface,
        paddingHorizontal: 14,
        marginBottom: space.xl,
      }}
    >
      <Ionicons name="search" size={15} color={scheme.textGhost} />
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={scheme.textGhost}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          flex: 1,
          paddingVertical: 12,
          fontFamily: fonts.body,
          fontSize: 16,
          color: scheme.textPrimary,
        }}
      />
    </View>
  );
}

export function FeedList<T>({
  lista,
  chave,
  renderItem,
  placeholderBusca,
  tituloVazio,
  descricaoVazia,
  iconeVazio,
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

  const { respiro } = useEspacoTabBar();
  const buscando = busca.trim().length > 0;

  const campoBusca = useMemo(() => {
    if (!placeholderBusca) return null;
    return <CampoBusca valor={busca} aoMudar={setBusca} placeholder={placeholderBusca} />;
  }, [placeholderBusca, busca, setBusca]);

  // Erro sem nada em tela: a lista inteira vira o erro. Erro com itens ja
  // carregados nao apaga o que a pessoa esta lendo — vira so o rodape.
  if (erro && itens.length === 0 && !carregando) {
    return (
      <View style={{ flex: 1 }}>
        {campoBusca ? (
          <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl }}>{campoBusca}</View>
        ) : null}
        <EmptyState
          icone="cloud-offline-outline"
          titulo="Não foi possível carregar"
          descricao={erro}
          acao={<Button label="Tentar de novo" onPress={() => void recarregar()} />}
        />
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={{ flex: 1, paddingHorizontal: space.gutter, paddingTop: space.xl }}>
        {campoBusca}
        <Esqueleto />
        <Esqueleto />
        <Esqueleto />
      </View>
    );
  }

  return (
    <FlatList
      data={itens}
      keyExtractor={chave}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={{
        paddingHorizontal: space.gutter,
        paddingTop: space.xl,
        paddingBottom: respiro,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {campoBusca}
          {cabecalho}
        </>
      }
      ListEmptyComponent={
        buscando ? (
          <EmptyState
            icone="search-outline"
            titulo="Nada encontrado"
            descricao={`Nenhum resultado para “${busca.trim()}”.`}
          />
        ) : (
          <EmptyState icone={iconeVazio} titulo={tituloVazio} descricao={descricaoVazia} />
        )
      }
      ListFooterComponent={
        carregandoMais ? (
          <View style={{ paddingVertical: space.xxl }}>
            <ActivityIndicator color={scheme.accent} />
          </View>
        ) : erro && itens.length > 0 ? (
          <Text
            variant="caption"
            color={scheme.textMuted}
            style={{ textAlign: 'center', paddingVertical: space.xxl }}
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
