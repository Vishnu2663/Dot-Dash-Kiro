import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Allows only POST and checks the caregiver passcode header. Returns false after replying. */
export function requirePost(req: VercelRequest, res: VercelResponse, opts: { auth: boolean }): boolean {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method not allowed" });
    return false;
  }
  if (opts.auth) {
    const expected = process.env.ALERT_PASSCODE ?? "";
    const given = req.headers["x-dotdash-key"];
    if (!expected || typeof given !== "string" || !safeEqual(given, expected)) {
      res.status(401).json({ error: "unauthorized" });
      return false;
    }
  }
  return true;
}

/** Request body as an object, or {} if it is missing or malformed. */
export function bodyOf(req: VercelRequest): Record<string, unknown> {
  const b = req.body;
  if (typeof b === "string") {
    try {
      const parsed = JSON.parse(b);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
}

export const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Tiny key-value store: Upstash Redis over REST when configured, otherwise process memory. */
const memory = new Map<string, string>();

export const storeKind = (): "redis" | "memory" =>
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "redis" : "memory";

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`store error ${res.status}`);
  return (await res.json() as { result: unknown }).result;
}

export async function kvGet(key: string): Promise<string | null> {
  if (storeKind() === "redis") return ((await redis(["GET", key])) as string | null) ?? null;
  return memory.get(key) ?? null;
}

export async function kvSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (storeKind() === "redis") await redis(["SET", key, value, "EX", ttlSeconds]);
  else memory.set(key, value);
}

export async function kvDel(key: string): Promise<void> {
  if (storeKind() === "redis") await redis(["DEL", key]);
  else memory.delete(key);
}

/** Sets `key` only if absent. Returns true when this call created it. Used for rate limiting. */
export async function kvClaim(key: string, ttlSeconds: number): Promise<boolean> {
  if (storeKind() === "redis") return (await redis(["SET", key, "1", "EX", ttlSeconds, "NX"])) === "OK";
  const raw = memory.get(key);
  if (raw && Number(raw) > Date.now()) return false;
  memory.set(key, String(Date.now() + ttlSeconds * 1000));
  return true;
}
