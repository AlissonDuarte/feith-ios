import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatarTempo } from './tempo.ts';

test('formata minutos e segundos com dois digitos', () => {
  assert.equal(formatarTempo(0), '0:00');
  assert.equal(formatarTempo(9), '0:09');
  assert.equal(formatarTempo(65), '1:05');
  assert.equal(formatarTempo(600), '10:00');
});

test('trunca o segundo em vez de arredondar', () => {
  // Arredondar faria o contador mostrar 1:00 enquanto o audio ainda esta em
  // 0:59 — e o tempo total pareceria maior que a duracao real.
  assert.equal(formatarTempo(59.9), '0:59');
});

test('passa de uma hora sem quebrar', () => {
  // Uma reflexao longa nao chega perto disso, mas o formato precisa degradar
  // para minutos em vez de zerar.
  assert.equal(formatarTempo(3661), '61:01');
});

test('valores nao numericos viram 0:00', () => {
  // `duration` chega 0 antes do metadata e NaN em alguns estados de buffer.
  // Sem a guarda o player mostra "NaN:NaN".
  assert.equal(formatarTempo(NaN), '0:00');
  assert.equal(formatarTempo(Infinity), '0:00');
  assert.equal(formatarTempo(-5), '0:00');
});
