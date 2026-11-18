import "server-only";
import { getMicrosoftConfig } from "./config";
import { GraphError } from "./errors";

/**
 * Entra ID app-only (client credentials) tokens for Microsoft Graph.
 * Tokens live only in server memory and are never logged, persisted or sent to the browser.
 * They are short-lived and cheap to re-acquire, so nothing needs encrypting at rest. If delegated
 * (per-user) tokens are added later, store refresh tokens encrypted — never in plain columns.
 */
interface CachedToken { value: string; expiresAt: number }
let cache: CachedToken | null = null;
let inflight: Promise<string> | null = null;

const SKEW_MS = 2 * 60_000; // refresh 2 minutes early

export function clearTokenCache() {
  cache = null;
}

export async function getAppToken(): Promise<string> {
  if (cache && cache.expiresAt - SKEW_MS > Date.now()) return cache.value;
  inflight ??= fetchToken().finally(() => { inflight = null; });
  return inflight;
}

async function fetchToken(): Promise<string> {
  const cfg = getMicrosoftConfig();
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    // Surface Entra's error code only — the body can echo request details.
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new GraphError(res.status, body.error ?? null, "Could not obtain a Microsoft Graph access token.");
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cache.value;
}
