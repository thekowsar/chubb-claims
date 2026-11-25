import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** `{ maxAmount: { max, actual } }` when the value is above `max` (e.g. settled above assessed). No max passes. */
export function maxAmount(max: number | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (max === null || max === undefined || value === null || value === '' || value === undefined) {
      return null;
    }
    const actual = Number(value);
    return actual > max ? { maxAmount: { max, actual } } : null;
  };
}
