import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TrailSummary } from '../api/types';
import {
  diasDaSequencia,
  ehNoite,
  filtrarTrilhas,
  fraseCentral,
  isoDoDia,
  minutosDeLeitura,
  rotuloDaNota,
  secaoAtual,
  trechoDoVersiculo,
  ultimosSeteDias,
} from './regras.ts';

const SEXTA = new Date(2026, 10, 13, 7, 12);

test('os sete dias terminam hoje, com as letras certas', () => {
  const dias = ultimosSeteDias(SEXTA, new Set(['2026-11-12']));
  assert.deepEqual(dias.map((d) => d.letra), ['S', 'D', 'S', 'T', 'Q', 'Q', 'S']);
  assert.equal(dias[6].hoje, true);
  assert.equal(dias[5].lido, true);
  assert.equal(dias[6].lido, false);
});

test('os sete dias atravessam a virada do mes', () => {
  const dias = ultimosSeteDias(new Date(2026, 10, 2), new Set());
  assert.equal(dias[0].iso, '2026-10-27');
  assert.equal(dias[6].iso, '2026-11-02');
});

test('sequencia sem leitura hoje conta a partir de ontem', () => {
  assert.deepEqual([...diasDaSequencia(SEXTA, 2, false)], ['2026-11-12', '2026-11-11']);
  assert.deepEqual([...diasDaSequencia(SEXTA, 2, true)], ['2026-11-13', '2026-11-12']);
});

test('noite vai das 18h as 5h', () => {
  assert.equal(ehNoite(new Date(2026, 10, 13, 21, 47)), true);
  assert.equal(ehNoite(new Date(2026, 10, 13, 2)), true);
  assert.equal(ehNoite(new Date(2026, 10, 13, 5)), false);
  assert.equal(ehNoite(new Date(2026, 10, 13, 17, 59)), false);
});

test('frase central prefere a ultima frase curta', () => {
  const texto = 'Jesus fala na vespera da cruz com os seus discipulos reunidos. Permanecer e confiar em quem produz o fruto.';
  assert.equal(fraseCentral(texto), 'Permanecer e confiar em quem produz o fruto.');
});

test('frase central sem texto devolve null e texto longo e cortado na palavra', () => {
  assert.equal(fraseCentral(null), null);
  assert.equal(fraseCentral('   '), null);
  const longo = fraseCentral('palavra '.repeat(40));
  assert.ok(longo!.endsWith('palavra…'));
  assert.ok(longo!.length <= 111);
});

test('trecho do versiculo corta na pontuacao', () => {
  const texto = 'O Senhor é o meu pastor; nada me faltará. Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.';
  assert.equal(trechoDoVersiculo(texto), 'O Senhor é o meu pastor; nada me faltará.');
  assert.equal(trechoDoVersiculo('Curto.'), 'Curto.');
  assert.equal(trechoDoVersiculo(null), '');
});

test('minutos de leitura nunca ficam abaixo de um', () => {
  assert.equal(minutosDeLeitura(['uma frase']), 1);
  assert.equal(minutosDeLeitura(['a '.repeat(690), null]), 3);
});

test('secao atual segue a rolagem', () => {
  const posicoes = [500, 1000, 1500];
  assert.equal(secaoAtual(posicoes, 0), -1);
  assert.equal(secaoAtual(posicoes, 400), 0);
  assert.equal(secaoAtual(posicoes, 1400), 2);
});

const trilha = (slug: string, dias: number, extra: Partial<TrailSummary> = {}) =>
  ({ slug, name: slug, days_count: dias, locked: false, kind: 'tema', progress: null, ...extra }) as TrailSummary;

test('para voce tira a ativa e as concluidas e poe as gratis curtas primeiro', () => {
  const lista = [
    trilha('paga', 3, { locked: true }),
    trilha('sete', 7),
    trilha('tres', 3),
    trilha('ativa', 3),
    trilha('feita', 3, { progress: { status: 'completed' } as TrailSummary['progress'] }),
  ];
  assert.deepEqual(filtrarTrilhas(lista, 'para_voce', 'ativa').map((t) => t.slug), ['tres', 'sete', 'paga']);
});

test('filtros por duracao e tipo', () => {
  const lista = [trilha('a', 5), trilha('b', 7, { kind: 'livro' }), trilha('c', 12, { kind: 'duas_vozes' })];
  assert.deepEqual(filtrarTrilhas(lista, 'curtas').map((t) => t.slug), ['a']);
  assert.deepEqual(filtrarTrilhas(lista, 'livros').map((t) => t.slug), ['b']);
  assert.deepEqual(filtrarTrilhas(lista, 'duas_vozes').map((t) => t.slug), ['c']);
});

test('rotulo da nota depende do dia', () => {
  assert.equal(rotuloDaNota(new Date(2026, 10, 13, 6), SEXTA), 'Hoje você anotou');
  assert.equal(rotuloDaNota(new Date(2026, 10, 12, 23), SEXTA), 'Ontem você anotou');
  assert.equal(rotuloDaNota(new Date(2026, 10, 1), SEXTA), 'Sua última anotação');
  assert.equal(rotuloDaNota(null, SEXTA), 'Sua última anotação');
});

test('iso usa o dia local', () => {
  assert.equal(isoDoDia(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
