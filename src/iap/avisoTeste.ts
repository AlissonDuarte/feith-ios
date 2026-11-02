import * as Notifications from 'expo-notifications';

import { posthog } from '../config/posthog';
import { registerForPush } from '../push/registerDevice';
import { NOME_LOJA } from './tipos';

const IDENTIFICADOR = 'feith-teste-dia-5';
const DIA_MS = 24 * 60 * 60 * 1000;

export async function avisoDoTestePossivel(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status !== 'denied';
  } catch {
    return false;
  }
}

export async function agendarAvisoDoTeste(agora = Date.now()): Promise<void> {
  try {
    const status = await registerForPush({ promptIfNeeded: true });
    if (status !== 'granted') return;
    await Notifications.cancelScheduledNotificationAsync(IDENTIFICADOR).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: IDENTIFICADOR,
      content: {
        title: 'Seu período grátis termina em 2 dias',
        body: `A primeira cobrança acontece no dia 7. Para não continuar, cancele antes na ${NOME_LOJA}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(agora + 5 * DIA_MS),
      },
    });
    posthog?.capture('trial_reminder_scheduled');
  } catch {
    posthog?.capture('trial_reminder_failed');
  }
}
