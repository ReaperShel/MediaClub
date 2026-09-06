import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { LogoIntro } from "@/components/logo-intro";
import { TransitionProvider, useTransition } from "@/components/transition-context";
import { MediaViewerProvider } from "@/components/media-viewer";
import { CommandPaletteProvider } from "@/components/command-palette";
import { GlobalShapeGridBackground } from "@/components/global-shape-grid-background";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error("Root error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Media Club — The Digital Archive" },
      {
        name: "description",
        content: "Student photography, film and visual storytelling from the Media Club archive.",
      },
      { name: "author", content: "Media Club" },
      { property: "og:title", content: "Media Club — The Digital Archive" },
      {
        property: "og:description",
        content: "Student photography, film and visual storytelling from the Media Club archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("media-club-intro-seen");
  });

  useEffect(() => {
    if (showIntro) {
      sessionStorage.setItem("media-club-intro-seen", "true");
    }
  }, [showIntro]);

  return (
    <QueryClientProvider client={queryClient}>
      <TransitionProvider>
        {showIntro ? <LogoIntro onComplete={() => setShowIntro(false)} /> : null}
        <GlobalShapeGridBackground />
        <RootFadeWrapper>
          <MediaViewerProvider>
            <CommandPaletteProvider>
              <Outlet />
            </CommandPaletteProvider>
          </MediaViewerProvider>
        </RootFadeWrapper>
      </TransitionProvider>
    </QueryClientProvider>
  );
}

function RootFadeWrapper({ children }: { children: ReactNode }) {
  const { isTransitioning } = useTransition();
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    if (!isTransitioning) {
      const hadTransition = sessionStorage.getItem("pending-transition-route");
      if (hadTransition) {
        setIsFadingIn(true);
        const timer = setTimeout(() => {
          setIsFadingIn(false);
          sessionStorage.removeItem("pending-transition-route");
          sessionStorage.removeItem("pending-transition-id");
        }, 400);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [isTransitioning]);

  return (
    <div
      style={{
        opacity: isFadingIn ? 0 : 1,
        transition: "opacity 0.35s ease",
      }}
    >
      {children}
    </div>
  );
}
