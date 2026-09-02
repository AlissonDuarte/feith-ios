/**
 * Testes dos parsers de data.
 *
 * Rodam no test runner embutido do Node 22 (`npm test`), sem Jest: sao funcoes
 * puras, sem nada de React Native, entao nao precisam do ambiente do RN.
 *
 * O caso que justifica o arquivo inteiro e o primeiro: `new Date("03/04/2026")`
 * devolve 4 de MARCO, e um historico ordenado assim sai errado sem lancar erro
 * nenhum.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatLongPT,
  formatRelativePT,
  isSameDay,
  parseDateBR,
  parseDateTimeBR,
  parseExpiresBR,
} from './dates.ts';

test('parseDateBR le dia/mes/ano, nao mes/dia/ano', () => {
  const d = parseDateBR('03/04/2026')!;
  assert.equal(d.getDate(), 3);
  assert.equal(d.getMonth(), 3, 'abril');
  assert.equal(d.getFullYear(), 2026);
});

test('parseDateBR resolve a data ambigua como pt-BR', () => {
  const d = parseDateBR('01/02/2026')!;
  assert.equal(d.getDate(), 1);
  assert.equal(d.getMonth(), 1, 'fevereiro');
});

test('parseDateBR rejeita data impossivel em vez de rolar o mes', () => {
  assert.equal(parseDateBR('31/02/2026'), null);
  assert.equal(parseDateBR('00/01/2026'), null);
  assert.equal(parseDateBR('13/13/2026'), null);
});

test('parseDateBR rejeita formatos que nao sao o do backend', () => {
  assert.equal(parseDateBR('2026-04-03'), null);
  assert.equal(parseDateBR('3/4/2026'), null);
  assert.equal(parseDateBR(''), null);
  assert.equal(parseDateBR(undefined), null);
  assert.equal(parseDateBR(null), null);
});

test('parseDateTimeBR le data e hora', () => {
  const d = parseDateTimeBR('25/12/2025 08:30')!;
  assert.equal(d.getDate(), 25);
  assert.equal(d.getMonth(), 11);
  assert.equal(d.getHours(), 8);
  assert.equal(d.getMinutes(), 30);
});

test('parseDateTimeBR exige a hora', () => {
  assert.equal(parseDateTimeBR('25/12/2025'), null);
});

test('parseExpiresBR le a hora ANTES da data', () => {
  const d = parseExpiresBR('23:59:59 31/12/2025')!;
  assert.equal(d.getDate(), 31);
  assert.equal(d.getMonth(), 11);
  assert.equal(d.getHours(), 23);
  assert.equal(d.getSeconds(), 59);
});

test('parseExpiresBR nao aceita a ordem dos outros dois formatos', () => {
  assert.equal(parseExpiresBR('31/12/2025 23:59:59'), null);
});

test('formatRelativePT descreve os primeiros dias e depois cai na data', () => {
  const hoje = new Date(2026, 3, 10);
  assert.equal(formatRelativePT(new Date(2026, 3, 10), hoje), 'hoje');
  assert.equal(formatRelativePT(new Date(2026, 3, 9), hoje), 'ontem');
  assert.equal(formatRelativePT(new Date(2026, 3, 7), hoje), 'há 3 dias');
  assert.equal(formatRelativePT(new Date(2026, 2, 1), hoje), '1 de março de 2026');
  assert.equal(formatRelativePT(null, hoje), '');
});

test('formatLongPT escreve o mes por extenso', () => {
  assert.equal(formatLongPT(parseDateBR('03/04/2026')), '3 de abril de 2026');
  assert.equal(formatLongPT(null), '');
});

test('isSameDay compara so a data local', () => {
  assert.equal(isSameDay(new Date(2026, 3, 10, 23, 59), new Date(2026, 3, 10, 0, 1)), true);
  assert.equal(isSameDay(new Date(2026, 3, 9), new Date(2026, 3, 10)), false);
  assert.equal(isSameDay(null), false);
});
