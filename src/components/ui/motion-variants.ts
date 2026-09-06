import { useEffect, useState } from "react";
import { type MotionProps, type Target } from "motion/react";

export const interactiveSpring = {
  type: "spring",
  stiffness: 380,
  damping: 26,
  mass: 0.7,
} as const;

export const tapScale: Target = { scale: 0.975 };

export const hoverScale: Target = { scale: 1.025 };

export const hoverLift: Target = { y: -2 };

export function useHoverable() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isTouchOnly = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none)").matches &&
    window.matchMedia("(pointer: coarse)").matches;

  const disabled = prefersReduced || isTouchOnly();

  const hover: MotionProps["whileHover"] = disabled ? undefined : { scale: 1.025, y: -2 };
  const tap: MotionProps["whileTap"] = disabled ? undefined : { scale: 0.975 };

  return { hover, tap, disabled, prefersReduced };
}

export const staggerChildren = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

export type { MotionProps };
