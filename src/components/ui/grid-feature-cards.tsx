"use client";

import { motion, useReducedMotion } from "motion/react";
import { Link } from "@tanstack/react-router";
import type { CategoryCard } from "@/components/hero/camera-hotspots";

const GRID_COLS_CLASSES = "grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4";

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCardInner({ feature }: { feature: CategoryCard }) {
  return (
    <Link
      to={feature.to}
      className="feature-card group relative flex flex-col justify-end overflow-hidden bg-background p-4 sm:p-8 md:p-9 transition-colors duration-300 hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25] transition-opacity duration-500 group-hover:opacity-[0.45]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(255,140,0,0.10) 0%, transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.3] transition-opacity duration-500 group-hover:opacity-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 28px)",
          maskImage: "radial-gradient(ellipse 70% 50% at 50% -10%, black 25%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% -10%, black 25%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col justify-end h-full gap-4 sm:gap-5">
        <div>
          <h3 className="text-xs sm:text-sm tracking-widest text-muted-foreground transition-colors duration-300 group-hover:text-primary mb-1.5 sm:mb-2">
            {feature.label}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground/70 leading-relaxed max-w-[260px] hidden sm:block">
            {feature.description}
          </p>
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-0 group-hover:opacity-100"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 3L9 7L5 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}

export function FeatureGrid({
  features,
  className,
  delay = 0.2,
}: {
  features: CategoryCard[];
  className?: string;
  delay?: number;
}) {
  return (
    <AnimatedContainer
      delay={delay}
      className={[GRID_COLS_CLASSES, "border border-dashed", className ?? ""].join(" ")}
    >
      {features.map((feature) => (
        <FeatureCardInner key={feature.id} feature={feature} />
      ))}
    </AnimatedContainer>
  );
}
