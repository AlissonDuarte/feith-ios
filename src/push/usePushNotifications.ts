/**
 * Liga as notificacoes ao ciclo de vida do app.
 *
 * Duas responsabilidades:
 *   1. Registrar o aparelho quando ha sessao — sem NUNCA abrir o prompt do
 *      sistema por conta propria. O prompt do iOS aparece uma vez na vida da
 *      instalacao; gasta-lo no primeiro boot, antes de a pessoa entender o que
 *      o app faz, e a forma mais rapida de perder o canal para sempre. Quem
 *      pede permissao e o toggle do perfil, com contexto.
 *   2. Navegar quando o usuario toca numa notificacao.
 */
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '../auth/AuthContext';
import { posthog } from '../config/posthog';
import { registerForPush } from './registerDevice';

/**
 * Com o app aberto, uma notificacao de lembrete diario nao deve roubar a tela
 * de quem ja esta lendo — mas o badge ainda faz sentido.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function propriedadesDaNotificacao(notification: Notifications.Notification) {
  const { content, identifier } = notification.request;
  const data = content.data as { url?: string } | undefined;
  return {
    notification_id: identifier,
    title: content.title ?? null,
    url: data?.url ?? null,
  };
}

export function usePushNotifications(): void {
  const { token } = useAuth();
  const router = useRouter();
  const registeredFor = useRef<string | null>(null);
  const abertas = useRef(new Set<string>());

  // Registra o aparelho uma vez por sessao, so para quem ja concedeu antes.
  useEffect(() => {
    if (!token || registeredFor.current === token) return;
    registeredFor.current = token;
    void registerForPush({ promptIfNeeded: false });
  }, [token]);

  // Tocar na notificacao leva para a leitura do dia.
  useEffect(() => {
    const registrarAbertura = (response: Notifications.NotificationResponse, coldStart: boolean) => {
      const props = propriedadesDaNotificacao(response.notification);
      if (abertas.current.has(props.notification_id)) return;
      abertas.current.add(props.notification_id);
      posthog?.capture('push_opened', { ...props, cold_start: coldStart });
    };

    const inicial = Notifications.getLastNotificationResponse();
    if (inicial) registrarAbertura(inicial, true);

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      registrarAbertura(response, false);
      const data = response.notification.request.content.data as { url?: string } | undefined;
      // O payload do backend usa `url` (scripts/notification.py:98). Hoje ele
      // sempre manda "/", mas respeitar o campo deixa o backend redirecionar
      // para uma reflexao especifica sem precisar de update na App Store.
      const destino = data?.url && data.url !== '/' ? data.url : '/(tabs)/hoje';
      router.push(destino as never);
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      posthog?.capture('push_received', { ...propriedadesDaNotificacao(notification), app_state: 'foreground' });
    });
    return () => sub.remove();
  }, []);
}
