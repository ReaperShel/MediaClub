import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { lockCreator, unlockCreator } from "@/lib/creator.functions";

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

export function CreatorPasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const unlock = useServerFn(unlockCreator);
  const lock = useServerFn(lockCreator);
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await unlock({ data: { password } });
      if (result.ok) {
        setPassword("");
        await queryClient.invalidateQueries({ queryKey: ["creator"] });
        onUnlocked();
      } else {
        setError(result.message ?? "Incorrect password.");
        if (result.retryAfterMinutes) {
          setTimeout(async () => {
            await lock({});
            onUnlocked();
          }, 0);
        }
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/90 p-5 backdrop-blur-sm">
      <div className="archive-frame mx-auto w-full max-w-md bg-surface-low p-8 md:p-12">
        <span className="label-caps text-primary">Creator Mode</span>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight uppercase">
          Creator Access
        </h2>
        <p className="mt-4 max-w-sm text-sm font-light text-muted-foreground">
          Enter the creator password to unlock the management panel. The session is secured with an
          encrypted, HttpOnly cookie.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Creator password"
            className={inputClass}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            minLength={1}
            maxLength={256}
            required
            disabled={pending}
          />
          {error ? <p className="text-xs text-secondary">{error}</p> : null}

          <button
            type="submit"
            disabled={pending || !password}
            className="label-caps border border-primary bg-primary px-6 py-4 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Unlocking…" : "Unlock Creator Mode"}
          </button>
        </form>
      </div>
    </div>
  );
}
