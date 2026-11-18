# Microsoft 365 / Teams integration guide

Status: **prepared, not connected.** The app runs entirely in demo mode on the mock provider. This
document describes what exists in the code, what the tenant administrator must set up, and what has
**not** been verified yet because no Microsoft 365 tenant is available.

Facts below marked ✔ were checked against Microsoft Learn (Graph v1.0) in November 2026. Anything
marked ⚠ is unconfirmed and must be checked at integration time. Microsoft changes these APIs; re-verify
before building on them.

## 1. What is already in the codebase

| Piece | Location | State |
|---|---|---|
| Provider contract (`MeetingProvider`) | `src/lib/providers/types.ts` | Done |
| Mock provider (demo) | `src/lib/providers/mock.ts` | Done, used today |
| Provider selection | `src/lib/providers/index.ts` (`MEETING_PROVIDER` env) | Done |
| Teams provider (Graph) | `src/lib/integrations/microsoft/teams-provider.ts` | Written, **untested against a tenant** |
| Entra ID app-only token manager | `.../token.ts` | Written, untested |
| Graph client (retry, 429 `Retry-After`, 401 refresh) | `.../graph-client.ts` | Written, untested |
| Request/response contracts (zod) | `.../contracts.ts` | Done |
| Webhook receiver (validation handshake, `clientState` check, enqueue) | `src/app/api/webhooks/microsoft/route.ts` | Written, untested with Graph |
| Event queue, duplicate protection | tables `provider_events` (unique per provider + event key) | Done |
| Event processor, subscription create/renew | `.../processor.ts`, `.../subscriptions.ts` | Lifecycle events handled; **resource change events are not mapped yet** |
| Scheduled job (process queue + renew) | `src/app/api/cron/microsoft/route.ts` | Written; **no schedule configured** |
| Provider logs | table `provider_logs` | Done |
| Readiness panel | Settings → "Meeting provider & Microsoft integration" | Done |

Nothing in demo mode contacts Microsoft. Simulated rows carry `data_source = 'simulated'`; rows created through the
Teams provider will carry `data_source = 'provider'`. The UI never presents simulated values as Teams data.

## 2. Microsoft Graph permissions to request

All are **application** permissions (the app acts as itself, no signed-in user). They require **tenant
administrator consent**.

| Purpose | Graph call | Permission | Notes |
|---|---|---|---|
| Create / update / delete / get Teams meetings | `POST/PATCH/DELETE/GET /users/{userId}/onlineMeetings` | `OnlineMeetings.ReadWrite.All` ✔ | Needs an **application access policy** (below) |
| Read attendance after a meeting | `GET /users/{userId}/onlineMeetings/{meetingId}/attendanceReports` (`?$expand=attendanceRecords`) | `OnlineMeetingArtifact.Read.All` ✔ | Report generated when the meeting **ends**; channel meetings unsupported; also needs the application access policy |
| Call quality / participants after a call | `GET /communications/callRecords/{id}` | `CallRecords.Read.All` ✔ | Record exists only **after the call ends** and is kept **30 days** ✔. Not live data. |
| Create Outlook calendar events | `POST /users/{userId}/events` | `Calendars.ReadWrite` ⚠ | Not checked yet. Optional. |
| Change notifications | `POST /subscriptions` | Same permission as the resource subscribed to ⚠ | Which resources support subscriptions, and max lifetime, differ per resource ⚠ |
| Look up users / co-organizers | `GET /users` | `User.Read.All` ⚠ | Optional; co-organizer assignment needs separate verification ⚠ |

Request the minimum set you actually use. Start with the first two rows.

### Application access policy (required for meetings and attendance)

For app-only calls to `/users/{userId}/onlineMeetings…`, a tenant admin must create an application access
policy and grant it to the organizer user (PowerShell, Teams module: `New-CsApplicationAccessPolicy`
then `Grant-CsApplicationAccessPolicy`). Microsoft documents this at "Allow applications to access online
meetings on behalf of a user". Without it, calls fail with 403 even when consent is granted. Policy
changes can take a while to propagate ⚠.

## 3. Tenant setup checklist (for the administrator)

1. Create (or get) a Microsoft 365 tenant with Teams licences for the organizer account.
2. Entra admin center → App registrations → **New registration** (single tenant).
3. Certificates & secrets → create a client secret (note the expiry; rotate before it lapses).
4. API permissions → Microsoft Graph → **Application** permissions from section 2 → **Grant admin consent**.
5. Create the application access policy and grant it to the organizer user (section 2).
6. Note the **Tenant ID**, **Application (client) ID**, and the organizer user's **Object ID**.
7. Set the environment variables below in Vercel (Production) and `.env.local` (never commit them).
8. Deploy to a public **https** URL. Graph cannot call localhost, so subscriptions cannot be created from a dev machine.
9. Set `MEETING_PROVIDER=microsoft_teams`.

## 4. Environment variables

See `.env.example`. Secrets stay server-side; none start with `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` | Entra app registration (client credentials) |
| `MS_ORGANIZER_USER_ID` | User the meetings are created for |
| `MS_WEBHOOK_CLIENT_STATE` | Long random secret Graph echoes in each notification |
| `MS_NOTIFICATION_BASE_URL` | Public origin; webhook is `{origin}/api/webhooks/microsoft` |
| `MS_SUBSCRIPTION_LIFETIME_MINUTES` | Optional, default 1440 (max differs per resource ⚠) |
| `SUPABASE_SERVICE_ROLE_KEY` | Lets the webhook and job write when no user is signed in |
| `CRON_SECRET` | Bearer secret protecting `/api/cron/microsoft` |
| `MEETING_PROVIDER` | `mock` (default) or `microsoft_teams` |

If `microsoft_teams` is selected while any `MS_*` variable is missing, meeting creation fails with a clear
error. It deliberately does **not** fall back to the simulator.

## 5. Webhooks and subscriptions

Verified behaviour ✔:

- **Validation.** When a subscription is created, Graph POSTs `?validationToken=…` to the notification URL. The endpoint must answer **200**, `text/plain`, body = the decoded token, within **10 s**. Implemented.
- **Notifications.** Answer a **2xx within 3 s**; otherwise Graph retries for up to 4 h and may throttle a slow endpoint. The receiver therefore only validates and enqueues, then returns **202**. Implemented.
- **Authenticity.** Every notification's `clientState` must equal the secret set at subscription creation; mismatches are dropped and logged. Implemented (constant-time compare; the secret is never stored in `provider_events`).
- **Duplicates.** Each event is keyed (`subscriptionId` + notification `id`, or a hash for lifecycle events) with a unique constraint, so redeliveries are ignored. Implemented.
- **Lifecycle notifications** (`reauthorizationRequired`, `subscriptionRemoved`, `missed`) go to `lifecycleNotificationUrl` (same endpoint here). Respond 202 quickly, then act. `reauthorizationRequired` is handled by renewing; `subscriptionRemoved` marks the subscription removed (it must be recreated); `missed` is logged (a resync is needed). `subscriptionRemoved` and `missed` are only sent for some resource types ✔, so do not rely on them alone.
- **Renewal.** `PATCH /subscriptions/{id}` with a new `expirationDateTime` renews **and** reauthorizes. Never send `/reauthorize` and a PATCH for the same subscription within 10 minutes ✔. The job renews anything expiring within 12 h.
- **Duplicate subscriptions** (same resource + change type) return 409 ✔.

Subscriptions are not created automatically. A function exists (`createSubscription`), but which resources
to subscribe to is a decision for integration time. A schedule for `/api/cron/microsoft` must also be added
(for example a Vercel Cron entry, which sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set).

## 6. What Teams will and will not provide (do not assume)

| Dashboard feature | With Teams |
|---|---|
| Create meeting + join URL | Available via Graph (after policy is set up) |
| Meeting status (Live/Waiting/…) | ⚠ **No status endpoint.** Must be derived from notifications, attendance or call records. `getMeetingStatus()` returns `null`. |
| Live participant count and join/leave | ⚠ **Not provided** by the onlineMeeting APIs used here. `getMeetingParticipants()` throws `NotSupportedByGraphError`. Real-time presence may need a different mechanism (e.g. a Teams app/bot or the cloud-communications calling APIs); this has not been investigated. |
| Attendance report | ✔ After the meeting ends |
| Technical/quality metrics | ✔ Call records, after the call ends, kept 30 days; not real time |
| Coordinator presence | ⚠ Inferred from attendance after the fact unless a live source is added |

The monitoring grid does not yet have a "no live data from Teams" state: when the Teams provider is switched on, the
cards must be changed to show unavailable fields as unavailable rather than as zero. Before go-live,
decide whether near-real-time participant counts are a requirement; if so, that needs its own design.

## 7. Security notes

- No client secret or token reaches the browser; the Microsoft modules import `server-only`.
- App tokens are cached in memory only; nothing is persisted. If delegated (per-user) tokens are ever added, store refresh tokens encrypted.
- `graphFetch` accepts only paths, never full URLs, so the bearer token cannot be sent to another host.
- The service-role key bypasses RLS: it is used only in the webhook and cron routes, which authenticate themselves (`clientState`, `CRON_SECRET`).
- Provider logs record names and status codes, never tokens or secrets.
- Rotate the client secret before expiry and rotate `MS_WEBHOOK_CLIENT_STATE` by recreating subscriptions.

## 8. First-connection test plan

1. Fill the environment variables; confirm Settings shows "Complete".
2. Create one meeting through the dashboard with `MEETING_PROVIDER=microsoft_teams`; confirm a real join URL.
3. Fix the 403 (application access policy) if it appears; allow time for policy propagation.
4. Deploy publicly, create one subscription, confirm the validation handshake succeeds and `integration_subscriptions` gets a row.
5. Trigger a change; confirm a row appears in `provider_events`, and a repeat delivery does not add a second row.
6. End a meeting, wait, and call `getMeetingAttendance`; compare with the Teams UI.
7. Only then map resource change events to dashboard updates in `processor.ts` and tell users which fields are live.
