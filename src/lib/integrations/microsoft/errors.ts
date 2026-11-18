export class GraphError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GraphError";
  }
  get retryable() {
    return this.status === 429 || this.status === 503 || this.status === 504 || this.status === 502;
  }
}

/** The Graph API genuinely cannot provide this (e.g. live participant presence). Never faked. */
export class NotSupportedByGraphError extends Error {
  constructor(what: string) {
    super(`${what} is not available from Microsoft Graph for this meeting type or timing.`);
    this.name = "NotSupportedByGraphError";
  }
}
