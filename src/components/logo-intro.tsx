import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onComplete: () => void;
};

export function LogoIntro({ onComplete }: Props) {
  const logoRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (prefersReducedMotion) {
      finish();
      return;
    }

    const startTimer = setTimeout(() => {
      setAnimating(true);
    }, 2000);

    return () => clearTimeout(startTimer);
  }, [prefersReducedMotion, finish]);

  useEffect(() => {
    if (!animating) return;

    const logo = logoRef.current;
    const overlay = overlayRef.current;
    if (!logo || !overlay) return;

    const target = document.querySelector<HTMLElement>("[data-logo]");

    if (target) {
      const rect = target.getBoundingClientRect();
      const vw = window.innerWidth;
      const introWidth = vw * 0.65;
      const scale = rect.width / introWidth;
      const translateX = rect.left + rect.width / 2 - window.innerWidth / 2;
      const translateY = rect.top + rect.height / 2 - window.innerHeight / 2;
      logo.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    const fadeTimer = setTimeout(() => {
      overlay.style.transition = "opacity 0.4s ease-out";
      overlay.style.opacity = "0";
    }, 600);

    const finishTimer = setTimeout(() => {
      finish();
    }, 1100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [animating, finish]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
    >
      <img
        ref={logoRef}
        src="/media-club-logo.png"
        alt="Media Club"
        draggable={false}
        className="h-auto w-[70vw] max-w-none md:w-[65vw] lg:w-[60vw]"
        style={{
          transition: animating ? "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        }}
      />
    </div>
  );
}
