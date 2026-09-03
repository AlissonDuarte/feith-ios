import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TODOS_OS_DIAS, diasDoServidor, diasParaServidor } from './agendamento.ts';
import type { WeekdayCode } from './types.ts';

test('lista vazia do servidor significa todos os dias', () => {
  assert.deepEqual(diasDoServidor([]), TODOS_OS_DIAS);
  assert.deepEqual(diasDoServidor(undefined), TODOS_OS_DIAS);
  assert.deepEqual(diasDoServidor(null), TODOS_OS_DIAS);
});

test('lista parcial do servidor e respeitada', () => {
  const dias: WeekdayCode[] = ['seg', 'qua', 'sex'];
  assert.deepEqual(diasDoServidor(dias), dias);
});

test('os sete dias marcados viram lista vazia', () => {
  assert.deepEqual(diasParaServidor([...TODOS_OS_DIAS]), []);
});

test('selecao parcial vai inteira para o servidor', () => {
  const dias: WeekdayCode[] = ['sab', 'dom'];
  assert.deepEqual(diasParaServidor(dias), dias);
});

test('ida e volta preserva o significado', () => {
  for (const caso of [[], ['seg'], ['sab', 'dom'], TODOS_OS_DIAS] as WeekdayCode[][]) {
    const naTela = diasDoServidor(caso);
    const deVolta = diasDoServidor(diasParaServidor(naTela));
    assert.deepEqual(deVolta, naTela, `quebrou para ${JSON.stringify(caso)}`);
  }
});
