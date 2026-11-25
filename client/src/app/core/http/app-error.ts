import { FieldError } from '../models/api-response.model';

/** Client-only code for status 0 (05 F4). Never sent by the API. */
export const NETWORK_ERROR = 'NETWORK_ERROR';

/** What services and components see when a call fails (05 §5.3). */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldError[] = [],
    readonly correlationId: string | null = null,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** 401 (session expired, not login's INVALID_CREDENTIALS) or 403: the interceptor shows the popup and navigates away. */
export function isAccessError(err: unknown): boolean {
  return err instanceof AppError && (err.status === 403 || (err.status === 401 && err.code !== 'INVALID_CREDENTIALS'));
}

/** Status 0 (network) or 5xx: the interceptor shows one popup with the reference id. Pages offer only Retry. */
export function isServerOrNetworkError(err: unknown): boolean {
  return err instanceof AppError && (err.status === 0 || err.status >= 500);
}

/**
 * True for errors the error interceptor already reported (401, 403, 0, 5xx).
 * Components show no error text of their own for these, so the user sees one message.
 * 400, 404 and 409 are not included: they stay on the page.
 */
export function isHandledGlobally(err: unknown): boolean {
  return isAccessError(err) || isServerOrNetworkError(err);
}
