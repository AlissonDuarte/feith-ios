import assert from 'node:assert/strict';
import { test } from 'node:test';

import { codigoDoBloqueio, descricaoDoDia, proximaSegunda, quandoLibera, rotuloHorario } from './regras.ts';

const sexta = new Date(2026, 9, 16);

test('proxima segunda a partir de sexta e de segunda', () => {
  assert.equal(proximaSegunda(sexta).getDate(), 19);
  assert.equal(proximaSegunda(new Date(2026, 9, 19)).getDate(), 26);
});

test('rotulo do horario', () => {
  assert.equal(rotuloHorario('07:00'), '7h');
  assert.equal(rotuloHorario('21:30'), '21h30');
});

test('quando libera', () => {
  assert.equal(quandoLibera('2026-10-16', sexta), 'Disponível hoje');
  assert.equal(quandoLibera('2026-10-17', sexta), 'Libera amanhã');
  assert.equal(quandoLibera('2026-10-19', sexta), 'Libera seg., 19/10');
});

test('descricao do dia', () => {
  const base = { number: 2, title: 't', scripture_reference: 'r', estimated_minutes: 7, unlocks_on: '2026-10-16', completed_on: null, hook: null };
  assert.equal(descricaoDoDia({ ...base, state: 'done', completed_on: '2026-10-16' }, sexta, false), 'Concluído hoje · 7 min');
  assert.equal(descricaoDoDia({ ...base, state: 'done', completed_on: '2026-10-14' }, sexta, false), 'Concluído qua. · 7 min');
  assert.equal(descricaoDoDia({ ...base, state: 'locked' }, sexta, true), 'Volte amanhã · até 2 dias por dia');
  assert.equal(descricaoDoDia({ ...base, state: 'locked', unlocks_on: '2026-10-17' }, sexta, false), 'Libera amanhã');
});

test('codigo do bloqueio vem do detail do 423', () => {
  assert.deepEqual(codigoDoBloqueio({ detail: { code: 'ainda_bloqueado', unlocks_on: '2026-10-17' } } as never), {
    code: 'ainda_bloqueado',
    unlocks_on: '2026-10-17',
  });
  assert.equal(codigoDoBloqueio({ detail: 'x' } as never), null);
});
