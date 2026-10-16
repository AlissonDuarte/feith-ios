import * as Notifications from 'expo-notifications';

import type { TrailDetail } from '../api/types';
import { dataLocal } from './regras';

const PREFIXO = 'trilha-';

export async function cancelarLembretesDaTrilha(slug: string) {
  try {
    const agendadas = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      agendadas
        .filter((n) => n.identifier.startsWith(`${PREFIXO}${slug}-`))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {}
}

export async function agendarLembretesDaTrilha(trilha: TrailDetail) {
  const progresso = trilha.progress;
  await cancelarLembretesDaTrilha(trilha.slug);
  if (!progresso || progresso.status !== 'active') return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const [hora, minuto] = progresso.reading_time.split(':').map(Number);
    const agora = new Date();
    const primeiro = new Date(agora);
    primeiro.setHours(hora, minuto, 0, 0);
    if (primeiro.getTime() <= agora.getTime()) primeiro.setDate(primeiro.getDate() + 1);
    const pendentes = trilha.days.filter((d) => d.state !== 'done');

    await Promise.all(
      pendentes.map((dia, i) => {
        const liberacao = dataLocal(dia.unlocks_on);
        liberacao.setHours(hora, minuto, 0, 0);
        const encaixe = new Date(primeiro);
        encaixe.setDate(primeiro.getDate() + i);
        const data = liberacao > encaixe ? liberacao : encaixe;
        return Notifications.scheduleNotificationAsync({
          identifier: `${PREFIXO}${trilha.slug}-${dia.number}`,
          content: {
            title: `Dia ${dia.number} · ${trilha.name}`,
            body: dia.title,
            data: { url: `/trilha/${trilha.slug}` },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
        });
      }),
    );
  } catch {}
}
