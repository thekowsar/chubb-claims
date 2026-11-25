import { AppError, isAccessError, isServerOrNetworkError } from '../../core/http/app-error';
import { ClaimDetail } from '../../core/models/claim.model';

/** What the Settle and Reject dialogs close with: the updated claim, or `conflict` after a 409 (the page reloads). */
export type DecisionResult = { claim: ClaimDetail } | 'conflict';

/** How a dialog should react to a failed settle / reject call (05 §7.2 "Action buttons and dialogs"). */
export type DecisionFailure =
  | { kind: 'inline'; message: string } // 400 / 404: show in the dialog, keep it open
  | { kind: 'conflict' } // 409: snackbar "changed, reloaded" and close so the page reloads
  | { kind: 'close' } // 401 / 403: the interceptor reported it and is navigating away
  | { kind: 'none' }; // 0 / 5xx: the interceptor popup is the one message; stay open so the user can retry

export function classifyDecisionError(err: unknown): DecisionFailure {
  if (isAccessError(err)) return { kind: 'close' };
  if (isServerOrNetworkError(err)) return { kind: 'none' };
  if (err instanceof AppError && err.status === 409) return { kind: 'conflict' };
  if (err instanceof AppError) return { kind: 'inline', message: err.details[0]?.message ?? err.message };
  return { kind: 'none' };
}
