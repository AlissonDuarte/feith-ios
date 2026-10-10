import assert from 'node:assert/strict';
import { test } from 'node:test';

import { INTERVALO_APOS_RECUSA_MS, momentoNaHoje } from './convite.ts';

const base = { status: 'undetermined' as const, optedOut: false, streak: 0, recusadoEm: null, agora: 1_000_000_000_000 };

test('sem permissao e sem sequencia convida apos a leitura', () => {
  assert.equal(momentoNaHoje(base), 'pos_leitura');
});

test('com dois ou mais dias seguidos usa a sequencia', () => {
  assert.equal(momentoNaHoje({ ...base, streak: 2 }), 'sequencia');
  assert.equal(momentoNaHoje({ ...base, streak: 1 }), 'pos_leitura');
});

test('permissao negada leva aos ajustes', () => {
  assert.equal(momentoNaHoje({ ...base, status: 'denied', streak: 5 }), 'ajustes');
});

test('quem ja permitiu, desligou no perfil ou nao tem suporte nao ve convite', () => {
  assert.equal(momentoNaHoje({ ...base, status: 'granted' }), null);
  assert.equal(momentoNaHoje({ ...base, status: 'unsupported' }), null);
  assert.equal(momentoNaHoje({ ...base, optedOut: true }), null);
});

test('recusa recente silencia por 7 dias', () => {
  const recusadoEm = base.agora - (INTERVALO_APOS_RECUSA_MS - 1);
  assert.equal(momentoNaHoje({ ...base, recusadoEm }), null);
  assert.equal(momentoNaHoje({ ...base, status: 'denied', recusadoEm }), null);
});

test('depois de 7 dias volta a convidar', () => {
  const recusadoEm = base.agora - INTERVALO_APOS_RECUSA_MS;
  assert.equal(momentoNaHoje({ ...base, recusadoEm }), 'pos_leitura');
});
