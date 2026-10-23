import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { View } from 'react-native';

type Registro = Map<string, RefObject<View | null>>;

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
 */
export function useTourTarget(key: string): RefObject<View | null> {
  const registro = useRegistro();
  const ref = useRef<View>(null);

  useEffect(() => {
    registro.set(key, ref);
    return () => {
      if (registro.get(key) === ref) registro.delete(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return ref;
}

/** Usado pelo proprio FeatureWalkthrough pra resolver o target_key de cada passo. */
export function useTourTargetsRegistry(): Registro {
  return useRegistro();
}
