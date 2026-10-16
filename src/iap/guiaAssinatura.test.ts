import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CONFIG_PADRAO,
  DIA_MS,
  configDoFlag,
  fraseDoLembrete,
  lembreteDevido,
  origemDe,
  registrarNoEstado,
  type EstadoLembretes,
} from './guiaAssinatura.ts';

const inicio = 1_000_000_000_000;
const dia = (n: number) => inicio + n * DIA_MS;
const novo: EstadoLembretes = { primeiroAcesso: inicio, ultimaExibicao: null, lembretes: 0 };

test('nada antes de 7 dias', () => {
  assert.equal(lembreteDevido(novo, dia(6.9)), null);
});

test('segue o calendario 7, 14, 30 e depois mensal', () => {
  let estado = registrarNoEstado(novo, 'onboarding', dia(0));
  assert.equal(lembreteDevido(estado, dia(7)), '7d');
  estado = registrarNoEstado(estado, 'lembrete', dia(7));
  assert.equal(lembreteDevido(estado, dia(13)), null);
  assert.equal(lembreteDevido(estado, dia(14)), '14d');
  estado = registrarNoEstado(estado, 'lembrete', dia(14));
  assert.equal(lembreteDevido(estado, dia(29)), null);
  assert.equal(lembreteDevido(estado, dia(30)), '30d');
  estado = registrarNoEstado(estado, 'lembrete', dia(30));
  assert.equal(lembreteDevido(estado, dia(59)), null);
  assert.equal(lembreteDevido(estado, dia(60)), 'mensal');
  estado = registrarNoEstado(estado, 'lembrete', dia(60));
  assert.equal(lembreteDevido(estado, dia(90)), 'mensal');
});

test('abrir a assinatura por conta propria adia o proximo lembrete', () => {
  const estado = registrarNoEstado(novo, 'perfil', dia(6));
  assert.equal(lembreteDevido(estado, dia(7)), null);
  assert.equal(lembreteDevido(estado, dia(13)), '7d');
});

test('quem volta depois de muito tempo nao recebe os marcos atrasados em fila', () => {
  const estado = registrarNoEstado(novo, 'lembrete', dia(40));
  assert.equal(estado.lembretes, 3);
  assert.equal(lembreteDevido(estado, dia(60)), null);
  assert.equal(lembreteDevido(estado, dia(70)), 'mensal');
});

test('flag desligado silencia os lembretes', () => {
  const config = configDoFlag(false, undefined);
  assert.equal(lembreteDevido(novo, dia(100), config), null);
});

test('payload do flag ajusta o calendario e ignora valores invalidos', () => {
  assert.deepEqual(configDoFlag(true, undefined), CONFIG_PADRAO);
  assert.deepEqual(configDoFlag(undefined, 'x'), CONFIG_PADRAO);
  const config = configDoFlag(true, { marcos: [10, 3, -1, 'a'], intervaloMensalDias: 45, intervaloMinimoDias: 0 });
  assert.deepEqual(config, { ativo: true, marcos: [3, 10], intervaloMensalDias: 45, intervaloMinimoDias: 7 });
  assert.equal(lembreteDevido(novo, dia(3), config), '3d');
});

test('origem desconhecida vira desconhecida', () => {
  assert.equal(origemDe('audio'), 'audio');
  assert.equal(origemDe('qualquer'), 'desconhecida');
  assert.equal(origemDe(undefined), 'desconhecida');
});

test('frase usa a sequencia e depois o tempo de uso', () => {
  assert.equal(fraseDoLembrete(5, 20), '5 dias seguidos com a Palavra. Que constância!');
  assert.equal(fraseDoLembrete(0, 8), 'Você caminha com o feith há uma semana.');
  assert.equal(fraseDoLembrete(1, 15), 'Você caminha com o feith há 2 semanas.');
  assert.equal(fraseDoLembrete(0, 31), 'Você caminha com o feith há um mês.');
  assert.equal(fraseDoLembrete(0, 65), 'Você caminha com o feith há 2 meses.');
  assert.equal(fraseDoLembrete(0, 2), 'Que bom ter você por aqui.');
});
