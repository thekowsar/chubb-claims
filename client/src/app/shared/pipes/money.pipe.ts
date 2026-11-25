import { Pipe, PipeTransform } from '@angular/core';

const FORMAT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `6200 | money:'MYR'` gives "MYR 6,200.00". Null or undefined gives an em dash. */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
      return '—';
    }
    const value = FORMAT.format(amount);
    return currency ? `${currency} ${value}` : value;
  }
}
