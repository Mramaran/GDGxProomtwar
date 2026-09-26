/** An error whose message is safe and helpful to show to the student. */
export class UserFacingError extends Error {}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** True when the model refused the call because a quota or rate limit was hit. */
export function isQuotaError(error: unknown): boolean {
  return /quota|429|resource.exhausted|rate.?limit/i.test(messageOf(error));
}

export function friendlyError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  const message = messageOf(error);
  if (/api-not-enabled|SERVICE_DISABLED/i.test(message)) {
    return 'The AI service is not enabled for this Firebase project yet. Enable Firebase AI Logic in the Firebase console.';
  }
  if (isQuotaError(error)) return 'The AI is busy right now. Wait a few seconds and try again.';
  if (/network|fetch|offline/i.test(message)) return 'Network problem. Check your connection and try again.';
  return 'Something went wrong while talking to the AI. Please try again.';
}
