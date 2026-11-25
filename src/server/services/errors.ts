export type DomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

// Stable sub-reason for precise UI messages (avoid magic message matching).
export type DomainErrorReason =
  | "DAILY_CAP"
  | "OUT_OF_MONTH"
  | "INVALID_QUANTITY"
  | "STALE_VERSION"
  | "REAUTH_REQUIRED"
  | "UNIT_CHANGE_WITH_ENTRIES";

// Business error with a stable code; the UI maps codes/reasons to French messages.
export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly reason?: DomainErrorReason;

  constructor(code: DomainErrorCode, message: string, reason?: DomainErrorReason) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.reason = reason;
  }
}

// Return the first row or throw NOT_FOUND — replaces ad-hoc rows[0] guards.
export function firstOrThrow<T>(rows: T[], message = "Not found"): T {
  const row = rows[0];
  if (row === undefined) {
    throw new DomainError("NOT_FOUND", message);
  }
  return row;
}
