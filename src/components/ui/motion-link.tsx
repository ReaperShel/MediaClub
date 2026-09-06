import * as React from "react";
import { Link } from "@tanstack/react-router";
import { motion, type MotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { useHoverable, interactiveSpring } from "./motion-variants";

type TanStackLinkProps = React.ComponentProps<typeof Link>;

export type MotionLinkProps = Omit<TanStackLinkProps, "to"> & {
  to: string;
  icon?: React.ReactNode;
  arrow?: boolean;
  underline?: boolean;
};

const MotionLink = React.forwardRef<HTMLAnchorElement, MotionLinkProps>(
  ({ className, to, icon, arrow = false, underline = false, children, ...props }, ref) => {
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

    const linkClassName = cn(
      "inline-flex items-center gap-2",
      underline && "underline underline-offset-4",
      className
    );

    return (
      <motion.span className="inline-flex" {...motionProps}>
        <Link ref={ref} to={to} className={linkClassName} {...props}>
          {content}
        </Link>
      </motion.span>
    );
  }
);

MotionLink.displayName = "MotionLink";

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

export { MotionLink };
