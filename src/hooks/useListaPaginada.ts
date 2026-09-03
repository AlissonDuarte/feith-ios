/**
 * Lista paginada com busca, para os tres feeds.
 *
 * Os tres componentes da web (BookmarkedFeed, NotesFeed, HistoryFeed) sao quase
 * identicos e cada um reimplementa paginacao com botoes anterior/proximo. Num
 * telefone esses botoes estao errados: o gesto e rolar. Entao aqui e scroll
 * infinito, e a logica mora num lugar so.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { mensagemDe } from '../api/errors';
import type { Page } from '../api/types';

const TAMANHO_PAGINA = 20;

/** Espera antes de buscar enquanto a pessoa ainda digita. */
const DEBOUNCE_MS = 350;

export interface ListaQuery {
  page: number;
  page_size: number;
  search?: string;
}

export interface ListaPaginada<T> {
  itens: T[];
  /** Primeira carga: a tela ainda nao tem nada para mostrar. */
  carregando: boolean;
  /** Pull-to-refresh em andamento. */
  atualizando: boolean;
  /** Buscando a proxima pagina no fim da lista. */
  carregandoMais: boolean;
  erro: string | null;
  temMais: boolean;
  total: number;
  busca: string;
  setBusca: (v: string) => void;
  recarregar: () => Promise<void>;
  carregarMais: () => void;
  /** Remove um item da lista sem refazer a requisicao (apos deletar). */
  removerLocal: (predicado: (item: T) => boolean) => void;
  /** Substitui um item no lugar (apos favoritar, por exemplo). */
  atualizarLocal: (predicado: (item: T) => boolean, novo: (item: T) => T) => void;
}

export function useListaPaginada<T>(
  buscar: (q: ListaQuery) => Promise<Page<T>>,
): ListaPaginada<T> {
  const [itens, setItens] = useState<T[]>([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');

  // `buscar` costuma ser uma arrow nova a cada render; guardar numa ref evita
  // que o efeito de carga dispare em loop.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  // Cada carga recebe um numero. Se uma resposta chegar depois de outra mais
  // nova ter sido pedida, ela e descartada — senao o resultado de uma busca
  // antiga sobrescreve a atual.
  const cargaAtual = useRef(0);

  const carregarPagina = useCallback(
    async (proximaPagina: number, termo: string, modo: 'inicial' | 'refresh' | 'mais') => {
      const id = ++cargaAtual.current;

      if (modo === 'inicial') setCarregando(true);
      if (modo === 'refresh') setAtualizando(true);
      if (modo === 'mais') setCarregandoMais(true);
      setErro(null);

      try {
        const page = await buscarRef.current({
          page: proximaPagina,
          page_size: TAMANHO_PAGINA,
          search: termo || undefined,
        });

        if (id !== cargaAtual.current) return;

        setItens((atuais) => (modo === 'mais' ? [...atuais, ...page.items] : page.items));
        setPagina(page.page);
        setTemMais(page.hasNextPage);
        setTotal(page.total);
      } catch (e) {
        if (id !== cargaAtual.current) return;
        setErro(mensagemDe(e));
      } finally {
        if (id === cargaAtual.current) {
          setCarregando(false);
          setAtualizando(false);
          setCarregandoMais(false);
        }
      }
    },
    [],
  );

  // Busca com debounce. Sem isto, cada tecla vira uma requisicao.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    void carregarPagina(1, buscaAplicada, 'inicial');
  }, [buscaAplicada, carregarPagina]);

  const recarregar = useCallback(async () => {
    await carregarPagina(1, buscaAplicada, 'refresh');
  }, [carregarPagina, buscaAplicada]);

  const carregarMais = useCallback(() => {
    if (!temMais || carregando || carregandoMais || atualizando) return;
    void carregarPagina(pagina + 1, buscaAplicada, 'mais');
  }, [temMais, carregando, carregandoMais, atualizando, pagina, buscaAplicada, carregarPagina]);

  const removerLocal = useCallback((predicado: (item: T) => boolean) => {
    setItens((atuais) => atuais.filter((i) => !predicado(i)));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const atualizarLocal = useCallback(
    (predicado: (item: T) => boolean, novo: (item: T) => T) => {
      setItens((atuais) => atuais.map((i) => (predicado(i) ? novo(i) : i)));
    },
    [],
  );

  return {
    itens,
    carregando,
    atualizando,
    carregandoMais,
    erro,
    temMais,
    total,
    busca,
    setBusca,
    recarregar,
    carregarMais,
    removerLocal,
    atualizarLocal,
  };
}
