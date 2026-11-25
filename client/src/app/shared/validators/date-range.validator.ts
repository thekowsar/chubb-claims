import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { toIsoDate } from './date-utils';

/** Group validator: `{ dateRange: true }` when `from` is after `to`. Either one empty passes. */
export function dateRange(fromKey: string, toKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const from = toIsoDate(group.get(fromKey)?.value as Date | string | null);
    const to = toIsoDate(group.get(toKey)?.value as Date | string | null);
    return from && to && from > to ? { dateRange: true } : null;
  };
}
