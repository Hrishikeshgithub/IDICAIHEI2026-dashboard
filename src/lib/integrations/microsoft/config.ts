import "server-only";

/**
 * Microsoft 365 configuration. Everything is read from server-side environment variables and is
 * never sent to the browser. Until all required variables are set the Teams provider is unavailable.
 */
const REQUIRED = [
  "MS_TENANT_ID",
  "MS_CLIENT_ID",
  "MS_CLIENT_SECRET",
  "MS_ORGANIZER_USER_ID", // object id of the user meetings are created for (covered by the application access policy)
  "MS_WEBHOOK_CLIENT_STATE", // secret echoed back by Graph in every notification
  "MS_NOTIFICATION_BASE_URL", // public https origin of this app, e.g. https://dashboard.example.org
] as const;

export type RequiredVar = (typeof REQUIRED)[number];

export interface MicrosoftConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  organizerUserId: string;
  webhookClientState: string;
  notificationBaseUrl: string;
  subscriptionLifetimeMinutes: number;
}

export function missingMicrosoftVars(env: NodeJS.ProcessEnv = process.env): RequiredVar[] {
  return REQUIRED.filter((k) => !env[k]?.trim());
}

/** Returns the config, or throws listing the variable NAMES that are missing (never values). */
export function getMicrosoftConfig(env: NodeJS.ProcessEnv = process.env): MicrosoftConfig {
  const missing = missingMicrosoftVars(env);
  if (missing.length) throw new ProviderNotConfiguredError(missing);
  const minutes = Number.parseInt(env.MS_SUBSCRIPTION_LIFETIME_MINUTES ?? "", 10);
  return {
    tenantId: env.MS_TENANT_ID!.trim(),
    clientId: env.MS_CLIENT_ID!.trim(),
    clientSecret: env.MS_CLIENT_SECRET!,
    organizerUserId: env.MS_ORGANIZER_USER_ID!.trim(),
    webhookClientState: env.MS_WEBHOOK_CLIENT_STATE!,
    notificationBaseUrl: env.MS_NOTIFICATION_BASE_URL!.trim().replace(/\/+$/, ""),
    // Max lifetime differs per resource type; read the real expiry from Graph's response.
    subscriptionLifetimeMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 1440,
  };
}

export class ProviderNotConfiguredError extends Error {
  constructor(readonly missing: string[]) {
    super(`Microsoft Teams provider is not configured. Missing: ${missing.join(", ")}`);
    this.name = "ProviderNotConfiguredError";
  }
}

/** Safe-to-display readiness: variable names and booleans only. */
export function getMicrosoftStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    variables: REQUIRED.map((name) => ({ name, set: !!env[name]?.trim() })),
    configured: missingMicrosoftVars(env).length === 0,
    selectedProvider: env.MEETING_PROVIDER === "microsoft_teams" ? ("microsoft_teams" as const) : ("mock" as const),
    cronSecretSet: !!env.CRON_SECRET?.trim(),
    serviceRoleSet: !!env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  };
}
