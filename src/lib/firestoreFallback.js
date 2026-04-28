export function shouldUseDemoFallback(error) {
  const fallbackCodes = new Set([
    "permission-denied",
    "failed-precondition",
    "unavailable",
    "unauthenticated",
    "network-request-failed",
    "firestore/timeout",
  ]);

  return fallbackCodes.has(error?.code);
}

function timeoutError(timeoutMs) {
  const error = new Error(`Firestore timeout after ${timeoutMs}ms`);
  error.code = "firestore/timeout";
  return error;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      globalThis.setTimeout(() => reject(timeoutError(timeoutMs)), timeoutMs);
    }),
  ]);
}

export async function withFirestoreFallback(operation, fallback, timeoutMs = 2500) {
  try {
    return await withTimeout(operation(), timeoutMs);
  } catch (error) {
    if (shouldUseDemoFallback(error)) {
      return fallback();
    }

    throw error;
  }
}
