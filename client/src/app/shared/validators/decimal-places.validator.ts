import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** `{ decimalPlaces: { max } }` when the number has more than `max` decimals (Money is multipleOf 0.01). */
export function decimalPlaces(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const text = String(value);
    const decimals = text.includes('.') ? text.split('.')[1].length : 0;
    return decimals > max ? { decimalPlaces: { max } } : null;
  };
}
