import { AbstractControl, ValidationErrors } from '@angular/forms';

/** `{ blank: true }` when a non-empty string is only whitespace (05 §6: "whitespace not allowed alone"). */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
}
