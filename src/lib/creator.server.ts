/**
 * Server-only creator-mode gate.
 *
 * A single shared password (project secret CREATOR_PASSWORD) unlocks an
 * encrypted, httpOnly session cookie. The password, its hash and the session
 * secret never leave the server; the browser only ever sees `{ unlocked }`.
 */
import { useSession } from "@tanstack/react-start/server";
import { getRequestHeader, getRequest } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { checkRateLimit } from "./rate-limit";

type CreatorSession = { unlocked?: boolean; at?: number };

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

let envCache: Record<string, string> | null = null;

function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  if (!envCache) {
    envCache = {};
    try {
      const envPath = resolve(process.cwd(), ".env");
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
          if (match) {
            const key = match[1];
            const rawValue = match[2];
            if (key && rawValue !== undefined) {
              let val = rawValue.trim();
              if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
              ) {
                val = val.slice(1, -1);
              }
              envCache[key] = val;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return envCache[key];
}

function sessionConfig() {
  const password = getEnvVar("CREATOR_SESSION_SECRET");
  if (!password || password.length < 32) {
    throw new Error("Creator mode is not configured.");
  }
  return {
    password,
    name: "mc-creator",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: getRequestHeader("x-forwarded-proto") === "https",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function digest(value: string) {
  return createHash("sha256").update(value.trim(), "utf8").digest();
}

function passwordMatches(input: string, expected: string) {
  return timingSafeEqual(digest(input), digest(expected));
}

function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function isUnlocked(): Promise<boolean> {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const session = await useSession<CreatorSession>(sessionConfig());
    return session.data.unlocked === true;
  } catch {
    return false;
  }
}

/** Throws when the caller has no valid creator session. */
export async function requireCreator(): Promise<void> {
  if (!(await isUnlocked())) throw new Error("Unauthorized: creator mode required.");
}

export async function lockCreatorSession(): Promise<{ ok: true }> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const session = await useSession<CreatorSession>(sessionConfig());
  await session.clear();
  return { ok: true };
}

export type UnlockResult = {
  ok: boolean;
  message?: string;
  retryAfterMinutes?: number;
};

export async function unlockCreatorSession(password: string): Promise<UnlockResult> {
  const request = getRequest();
  const rate = checkRateLimit(request, undefined, {
    windowMs: 60_000,
    max: 10,
  });
  if (!rate.ok) {
    return {
      ok: false,
      message: "Too many attempts. Try again later.",
      retryAfterMinutes: Math.max(1, Math.ceil(rate.retryAfterMs / 60000)),
    };
  }

  const expected = getEnvVar("CREATOR_PASSWORD");
  if (!expected) return { ok: false, message: "Creator mode is not configured." };

  const db = await admin();
  const key = clientKey();
  const now = new Date();

  const { data: attempt } = await db
    .from("creator_auth_attempts")
    .select("fail_count, locked_until")
    .eq("id", key)
    .maybeSingle();

  const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until) : null;
  if (lockedUntil && lockedUntil > now) {
    return {
      ok: false,
      message: "Too many attempts. Try again later.",
      retryAfterMinutes: Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000)),
    };
  }

  if (!passwordMatches(password, expected)) {
    const fails = (lockedUntil ? 0 : (attempt?.fail_count ?? 0)) + 1;
    const lock = fails >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : null;
    await db.from("creator_auth_attempts").upsert({
      id: key,
      fail_count: lock ? 0 : fails,
      locked_until: lock ? lock.toISOString() : null,
      updated_at: now.toISOString(),
    });
    return {
      ok: false,
      message: lock ? "Too many attempts. Try again later." : "Incorrect password.",
      ...(lock ? { retryAfterMinutes: LOCKOUT_MINUTES } : {}),
    };
  }

  await db.from("creator_auth_attempts").upsert({
    id: key,
    fail_count: 0,
    locked_until: null,
    updated_at: now.toISOString(),
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const session = await useSession<CreatorSession>(sessionConfig());
  await session.update({ unlocked: true, at: Date.now() });
  return { ok: true };
}

export function toCsv(rows: Record<string, string>[], headers: string[]): string {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  return lines.join("\r\n");
}
