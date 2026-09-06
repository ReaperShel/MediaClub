import { useRouterState } from "@tanstack/react-router";
import { ShapeGrid } from "@/components/ui/shape-grid";

export function GlobalShapeGridBackground() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  // Keep Creator Mode on its dedicated plain dark dashboard background
  if (pathname.startsWith("/creator")) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
      style={{
        backgroundColor: "var(--background)",
      }}
    >
      <ShapeGrid
        direction="diagonal"
        speed={0.3}
        squareSize={48}
        borderColor="rgba(255, 255, 255, 0.045)"
        hoverFillColor="rgba(255, 115, 36, 0.16)"
        hoverTrailAmount={1}
        shape="square"
        vignetteColor="rgba(10, 11, 14, 0.9)"
        enableVignette={true}
        useGlobalPointer={true}
        className="h-full w-full"
      />
      {/* Subtle dark tint overlay to ensure foreground editorial typography remains 100% readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: "rgba(8, 10, 12, 0.35)",
        }}
      />
    </div>
  );
}

export default GlobalShapeGridBackground;
