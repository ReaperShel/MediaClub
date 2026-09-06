import * as React from "react";
import { motion, type MotionProps } from "motion/react";
import { type ButtonProps, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import { useHoverable, interactiveSpring } from "./motion-variants";

export type MotionButtonProps = ButtonProps & {
  icon?: React.ReactNode;
  arrow?: boolean;
};

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, asChild = false, icon, arrow = false, children, ...props }, ref) => {
    const { hover, tap } = useHoverable();

    const motionProps: MotionProps = {
      transition: interactiveSpring,
      ...(hover ? { whileHover: hover } : {}),
      ...(tap ? { whileTap: tap } : {}),
    };

    const content = (
      <>
        {icon && <span className="flex items-center justify-center">{icon}</span>}
        {children}
        {arrow && (
          <motion.span className="inline-flex items-center justify-center" aria-hidden="true">
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </motion.span>
        )}
      </>
    );

    const baseClassName = cn(
      buttonVariants({ variant, size }),
      "inline-flex items-center gap-2",
      className
    );

    return (
      <motion.button
        ref={ref}
        className={baseClassName}
        {...motionProps}
        {...(props as MotionProps & React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </motion.button>
    );
  }
);

MotionButton.displayName = "MotionButton";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3tables.org/2000/svg"
    >
      <path
        d="M5.5 3.5L10 7.5L5.5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { MotionButton };
