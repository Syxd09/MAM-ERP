export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[App Error]", error, context);
}
