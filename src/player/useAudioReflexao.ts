/**
 * Estado do audio de uma reflexao: busca, sessao de audio e renovacao da URL.
 *
 * O componente (PlayerAudio.tsx) so desenha — toda a parte que erra fica aqui.
 * Tres coisas que a web nao faz e que este hook faz:
 *
 *   1. Renova a URL assinada aos 50 minutos. A assinatura do R2 vale 60
 *      (r2.py:35-38), e quem pausa no meio da leitura e volta depois disso
 *      encontra um 403 — o audio para de carregar sem dizer nada. `issuedAt`
 *      existe no client justamente para isto (client.ts:353-357).
 *   2. Configura a sessao de audio. Sem `playsInSilentMode` o audio fica MUDO
 *      para quem deixa o iPhone no silencioso, que e a maioria das pessoas.
 *   3. Distingue os erros: 403 e "voce nao e apoiador", 404 e "esta reflexao
 *      nao tem audio". Colapsar os dois foi o que deixou o problema da web
 *      invisivel por tanto tempo.
 */
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api/client';
import { ehLimiteDePlano, mensagemDe } from '../api/errors';
import type { Transcript } from '../api/types';

/** Dez minutos de folga antes dos 60 da assinatura. */
const RENOVAR_APOS_MS = 50 * 60 * 1000;

/** O salto de +/- que os players de podcast usam. */
export const SALTO_SEGUNDOS = 15;

export const VELOCIDADES = [0.5, 1, 1.5, 2] as const;

/**
 * A sessao de audio e global do processo, nao do componente: configurar uma vez
 * basta, e reconfigurar a cada montagem do player derruba o audio que estiver
 * tocando.
 */
let sessaoConfigurada = false;

async function configurarSessao() {
  if (sessaoConfigurada) return;
  try {
    await setAudioModeAsync({
      // Sem isto o audio nao sai no silencioso — o modo em que a maioria das
      // pessoas deixa o telefone.
      playsInSilentMode: true,
      // Continua com a tela apagada. Depende do UIBackgroundModes: ['audio']
      // declarado em app.config.ts.
      shouldPlayInBackground: true,
      // Uma reflexao nao e efeito sonoro: ela pede a atencao inteira, e o
      // default do modulo ('mixWithOthers') deixaria tocar por cima de um
      // podcast que ja estivesse rolando.
      interruptionMode: 'doNotMix',
    });
    sessaoConfigurada = true;
  } catch {
    // Falhar aqui degrada a experiencia (silencioso, background), mas nao
    // impede a reproducao. Nao vale bloquear o play por causa disso.
  }
}

export interface AudioReflexao {
  transcript: Transcript | null;
  carregando: boolean;
  erro: string | null;
  /** true quando o erro e "voce nao e apoiador" — a tela nao mostra o player. */
  semAcesso: boolean;
  tocando: boolean;
  bufferizando: boolean;
  posicao: number;
  duracao: number;
  velocidade: number;
  alternar: () => void;
  saltar: (segundos: number) => void;
  irPara: (segundos: number) => void;
  ciclarVelocidade: () => void;
  tentarDeNovo: () => void;
}

export function useAudioReflexao(reflectionUuid: string | undefined): AudioReflexao {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [semAcesso, setSemAcesso] = useState(false);

  const player = useAudioPlayer(transcript ? { uri: transcript.audioUrl } : null);
  const status = useAudioPlayerStatus(player);

  // Evita setState depois do unmount, no mesmo padrao do AuthContext.
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const buscar = useCallback(async () => {
    if (!reflectionUuid) return;

    setCarregando(true);
    setErro(null);
    try {
      const t = await api.getTranscript(reflectionUuid);
      if (!montado.current) return;
      setTranscript(t);
      setSemAcesso(false);
    } catch (e) {
      if (!montado.current) return;
      // "Nao e apoiador" nao e erro a mostrar: e ausencia de feature, e a tela
      // simplesmente nao desenha o player. `ehLimiteDePlano` ja sabe quais
      // status e detalhes significam isso (errors.ts) — replicar a regra aqui
      // seria a duplicacao que o modulo existe para evitar. O 401 nao passa por
      // aqui: o client desloga antes (client.ts:116).
      if (ehLimiteDePlano(e)) {
        setSemAcesso(true);
        setErro(null);
      } else {
        setErro(mensagemDe(e));
      }
    } finally {
      if (montado.current) setCarregando(false);
    }
  }, [reflectionUuid]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  // Renovacao da URL assinada. Trocar a fonte reinicia a posicao, entao ela e
  // guardada antes e restaurada depois — quem estava no minuto 12 continua no
  // minuto 12, que e o ponto inteiro de renovar em vez de deixar expirar.
  useEffect(() => {
    if (!transcript) return;

    const restante = transcript.issuedAt + RENOVAR_APOS_MS - Date.now();
    const timer = setTimeout(
      async () => {
        if (!reflectionUuid || !montado.current) return;
        const posicao = status.currentTime;
        const estavaTocando = status.playing;
        try {
          const novo = await api.getTranscript(reflectionUuid);
          if (!montado.current) return;
          setTranscript(novo);
          player.replace({ uri: novo.audioUrl });
          await player.seekTo(posicao);
          if (estavaTocando) player.play();
        } catch {
          // Renovacao que falha nao derruba o que ja esta tocando: a URL atual
          // ainda vale por alguns minutos. O erro aparece quando ela expirar
          // de fato.
        }
      },
      Math.max(0, restante),
    );

    return () => clearTimeout(timer);
    // `status` muda a cada tick; depender dele reagendaria o timer sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, reflectionUuid, player]);

  const alternar = useCallback(() => {
    void configurarSessao().then(() => {
      if (player.playing) player.pause();
      else player.play();
    });
  }, [player]);

  const irPara = useCallback(
    (segundos: number) => {
      const alvo = Math.max(0, Math.min(segundos, status.duration || 0));
      void player.seekTo(alvo);
    },
    [player, status.duration],
  );

  const saltar = useCallback(
    (segundos: number) => irPara(status.currentTime + segundos),
    [irPara, status.currentTime],
  );

  const ciclarVelocidade = useCallback(() => {
    const atual = VELOCIDADES.indexOf(status.playbackRate as (typeof VELOCIDADES)[number]);
    const proxima = VELOCIDADES[(atual + 1) % VELOCIDADES.length];
    player.setPlaybackRate(proxima);
  }, [player, status.playbackRate]);

  return {
    transcript,
    carregando,
    erro,
    semAcesso,
    tocando: status.playing,
    bufferizando: status.isBuffering,
    posicao: status.currentTime,
    duracao: status.duration,
    velocidade: status.playbackRate || 1,
    alternar,
    saltar,
    irPara,
    ciclarVelocidade,
    tentarDeNovo: () => void buscar(),
  };
}
