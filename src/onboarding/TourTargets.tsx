import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';

interface Alvo {
  ref: RefObject<View | null>;
  /** Mesma acao que o toque real no elemento dispara — opcional porque um
   * alvo so-de-destaque (ex.: icone de aba, que a propria Tabs ja navega)
   * nao precisa declarar nada aqui. */
  onPress?: () => void;
}

type Registro = Map<string, Alvo>;

const TourTargetsContext = createContext<Registro | null>(null);

/**
 * Registro global de "alvos" que um walkthrough guiado (FeatureWalkthrough)
 * pode apontar. Fica acima de tudo em app/_layout.tsx porque os alvos (ex.:
 * icones da tab bar) e o walkthrough que os consome vivem em arvores
 * diferentes — a tab bar nao sabe quando um walkthrough vai precisar dela.
 */
export function TourTargetsProvider({ children }: { children: ReactNode }) {
  const registro = useRef<Registro>(new Map()).current;
  return <TourTargetsContext.Provider value={registro}>{children}</TourTargetsContext.Provider>;
}

function useRegistro(): Registro {
  const registro = useContext(TourTargetsContext);
  if (!registro) throw new Error('useTourTarget: TourTargetsProvider ausente em app/_layout.tsx');
  return registro;
}

/**
 * Qualquer elemento que deva poder ser apontado por um onboarding guiado
 * chama isto com uma chave estavel (ex.: "tab_trilhas") e anexa o ref
 * devolvido ao elemento real. O backend referencia a MESMA chave em
 * OnboardingStep.target_key — e assim que o passo sabe o que destacar.
 *
 * `onPress`, se passado, e o que o FeatureWalkthrough dispara no ultimo
 * passo ao tocar no CTA — produz o mesmo efeito de tocar no elemento de
 * verdade, em vez de so fechar o walkthrough. Guardado num ref (padrao ja
 * usado em IapContext.tsx/hoje.tsx) pra nunca ficar com uma versao antiga:
 * o efeito de registro so roda de novo se `key` mudar, nao a cada render.
 */
export function useTourTarget(key: string, opcoes?: { onPress?: () => void }): RefObject<View | null> {
  const registro = useRegistro();
  const ref = useRef<View>(null);
  const onPressRef = useRef(opcoes?.onPress);
  onPressRef.current = opcoes?.onPress;

  useEffect(() => {
    registro.set(key, { ref, onPress: () => onPressRef.current?.() });
    return () => {
      if (registro.get(key)?.ref === ref) registro.delete(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ref;
}

/** Usado pelo proprio FeatureWalkthrough pra resolver o target_key de cada passo. */
export function useTourTargetsRegistry(): Registro {
  return useRegistro();
}
