import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Team Sign In — Media Club" },
      {
        name: "description",
        content: "Sign in to the Media Club management portal to review event coverage requests.",
      },
      { property: "og:title", content: "Team Sign In — Media Club" },
      { property: "og:description", content: "Media Club team access only." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        navigate({ to: "/" });
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (err) throw err;
        setNotice("Account created. If email confirmation is required, check your inbox.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (err) throw err;
      // On success Supabase redirects to the provider; nothing else to do here.
    } catch {
      setError("Google sign-in is unavailable right now.");
    }
  }

  return (
    <SiteShell>
      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="archive-frame mx-auto max-w-md px-6 py-10">
          <span className="label-caps text-primary">Team access</span>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight uppercase">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-3 text-sm font-light text-muted-foreground">
            Only Media Club administrators can review event requests.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={inputClass}
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputClass}
            />
            {error ? <p className="text-xs text-secondary">{error}</p> : null}
            {notice ? <p className="text-xs text-primary">{notice}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="label-caps border border-primary bg-primary px-6 py-4 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogle}
            className="label-caps mt-4 w-full border border-border px-6 py-4 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-xs text-muted-foreground underline transition-colors hover:text-primary"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>

          <div className="mt-8 border-t border-border pt-6">
            <Link to="/" className="label-caps text-muted-foreground hover:text-primary">
              Back to site
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
