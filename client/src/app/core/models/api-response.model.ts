/** Envelope returned by every API call (04-api-spec.yaml ApiResponse). */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_ASSIGNEE'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'ACCESS_DENIED'
  | 'CLAIM_NOT_FOUND'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_STATUS_TRANSITION'
  | 'MESSAGING_NOT_ALLOWED'
  | 'CONCURRENT_MODIFICATION'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string | null;
  message: string;
}

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  details: FieldError[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export function isApiResponse(body: unknown): body is ApiResponse<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ApiResponse<unknown>).success === 'boolean' &&
    'data' in body &&
    'error' in body
  );
}
