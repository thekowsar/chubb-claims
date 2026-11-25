import { FormGroup } from '@angular/forms';
import { FieldError } from '../../core/models/api-response.model';

/**
 * Maps VALIDATION_FAILED details onto form controls as `{ server: message }` (05 §5.3).
 * Returns the messages that don't match a control, for a form-level banner.
 */
export function applyServerErrors(form: FormGroup, details: FieldError[]): string[] {
  const unmatched: string[] = [];
  for (const detail of details) {
    const control = detail.field ? form.get(detail.field) : null;
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: detail.message });
      control.markAsTouched();
    } else {
      unmatched.push(detail.field ? `${detail.field}: ${detail.message}` : detail.message);
    }
  }
  return unmatched;
}
