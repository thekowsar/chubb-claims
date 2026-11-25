import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toIsoDate } from './date-utils';

/** Fails with `{ futureDate: true }` when the date is after today (local). Empty passes (use `required`). */
export function notFutureDate(today: () => Date = () => new Date()): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = toIsoDate(control.value as Date | string | null);
    if (!value) {
      return null;
    }
    return value > (toIsoDate(today()) as string) ? { futureDate: true } : null;
  };
}
