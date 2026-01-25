export type ApiErrorCode =
  | "validation_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "duplicate_front"
  | "duplicate_source"
  | "internal_error";

export function createErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return new Response(
    JSON.stringify({
      error: { code, message, details },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; message?: string };
    return err.code === "23505" || err.message?.toLowerCase().includes("unique") || false;
  }
  return false;
}
