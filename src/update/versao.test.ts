import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compararVersoes, situacaoDaVersao } from './versao.ts';

test('compara numericamente e nao como texto', () => {
  assert.equal(compararVersoes('1.0.10', '1.0.9'), 1);
  assert.equal(compararVersoes('1.0.9', '1.0.10'), -1);
  assert.equal(compararVersoes('2.0.0', '1.9.9'), 1);
});

test('partes ausentes valem zero', () => {
  assert.equal(compararVersoes('1.1', '1.1.0'), 0);
  assert.equal(compararVersoes('1', '1.0.1'), -1);
});

test('abaixo do minimo e obrigatoria, mesmo abaixo do latest', () => {
  assert.equal(situacaoDaVersao('1.0.1', { min_version: '1.0.2', latest_version: '1.0.3' }), 'obrigatoria');
});

test('entre o minimo e o latest e recomendada', () => {
  assert.equal(situacaoDaVersao('1.0.2', { min_version: '1.0.0', latest_version: '1.0.3' }), 'recomendada');
});

test('igual ao latest esta em dia', () => {
  assert.equal(situacaoDaVersao('1.0.3', { min_version: '1.0.2', latest_version: '1.0.3' }), 'em_dia');
});

test('backend sem configuracao (0.0.0) nao incomoda ninguem', () => {
  assert.equal(situacaoDaVersao('1.0.2', { min_version: '0.0.0', latest_version: '0.0.0' }), 'em_dia');
});
