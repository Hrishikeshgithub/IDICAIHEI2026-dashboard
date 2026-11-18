import "server-only";
import { GraphError } from "./errors";
import { clearTokenCache, getAppToken } from "./token";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const MAX_ATTEMPTS = 4;
const MAX_WAIT_MS = 30_000;

export type GraphLogger = (level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>) => void | Promise<void>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetryAfter(res: Response): number | undefined {
  const v = Number(res.headers.get("retry-after"));
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

/**
 * Calls Microsoft Graph with the app token. Handles:
 *  - 429/502/503/504: waits for Retry-After (or exponential backoff with jitter) and retries
 *  - 401: refreshes the token once
 * `path` must be a Graph path such as "/users/{id}/onlineMeetings" — full URLs are rejected so a
 * crafted value can never redirect the bearer token to another host.
 */
export async function graphFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
  log?: GraphLogger,
): Promise<T | null> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("graphFetch expects a path starting with a single '/'");

  let refreshedAuth = false;
  for (let attempt = 1; ; attempt++) {
    const token = await getAppToken();
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });

    if (res.ok) return res.status === 204 ? null : ((await res.json()) as T);

    const err = await res.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    const graphError = new GraphError(res.status, err.error?.code ?? null, `Graph ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status})`, parseRetryAfter(res));

    if (res.status === 401 && !refreshedAuth) {
      refreshedAuth = true;
      clearTokenCache();
      continue;
    }
    if (graphError.retryable && attempt < MAX_ATTEMPTS) {
      const backoff = Math.min(MAX_WAIT_MS, (graphError.retryAfterSeconds ?? 2 ** attempt) * 1000) + Math.random() * 250;
      await log?.("warn", "Graph request throttled/unavailable; retrying", { path: path.split("?")[0], status: res.status, attempt, waitMs: Math.round(backoff) });
      await sleep(backoff);
      continue;
    }
    await log?.("error", "Graph request failed", { path: path.split("?")[0], status: res.status, code: graphError.code, attempt });
    throw graphError;
  }
}
