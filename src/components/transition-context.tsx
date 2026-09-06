import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface TransitionContextValue {
  isTransitioning: boolean;
  transitioningId: string | null;
  pendingRoute: string | null;
  focusPoint: { x: number; y: number } | null;
  startTransition: (id: string, route: string, focusPoint?: { x: number; y: number }) => void;
  resetTransition: () => void;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const startTransition = useCallback(
    (id: string, route: string, fp?: { x: number; y: number }) => {
      setIsTransitioning(true);
      setTransitioningId(id);
      setPendingRoute(route);
      setFocusPoint(fp ?? null);
      sessionStorage.setItem("pending-transition-route", route);
      sessionStorage.setItem("pending-transition-id", id);
    },
    []
  );

  const resetTransition = useCallback(() => {
    setIsTransitioning(false);
    setTransitioningId(null);
    setPendingRoute(null);
    setFocusPoint(null);
    // Note: sessionStorage cleanup is handled by RootFadeWrapper
    // after it detects and processes the pending route fade.
  }, []);

  return (
    <TransitionContext.Provider
      value={{
        isTransitioning,
        transitioningId,
        pendingRoute,
        focusPoint,
        startTransition,
        resetTransition,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("useTransition must be used within TransitionProvider");
  return ctx;
}
