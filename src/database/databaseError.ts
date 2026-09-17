import "server-only";

export class DatabaseError extends Error {
  readonly cause: unknown;

  constructor(
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
    this.cause = cause;
  }
}

export function toDatabaseError(
  operation: string,
  error: unknown,
): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  const detail =
    error instanceof Error
      ? error.message
      : String(error);

  return new DatabaseError(
    `Database ${operation} failed: ${detail}`,
    error,
  );
}
