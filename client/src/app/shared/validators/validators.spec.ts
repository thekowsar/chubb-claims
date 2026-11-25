import { FormControl, FormGroup } from '@angular/forms';
import { fromIsoDate, toIsoDate } from './date-utils';
import { dateRange } from './date-range.validator';
import { decimalPlaces } from './decimal-places.validator';
import { maxAmount } from './max-amount.validator';
import { notBlank } from './not-blank.validator';
import { notFutureDate } from './not-future-date.validator';

describe('validators (T12)', () => {
  describe('notFutureDate', () => {
    const today = () => new Date(2026, 10, 25);
    const v = notFutureDate(today);

    it('today is OK', () => expect(v(new FormControl(new Date(2026, 10, 25, 23, 59)))).toBeNull());
    it('yesterday is OK', () => expect(v(new FormControl('2026-11-24'))).toBeNull());
    it('tomorrow fails', () => expect(v(new FormControl(new Date(2026, 10, 26)))).toEqual({ futureDate: true }));
    it('empty passes', () => expect(v(new FormControl(null))).toBeNull());
  });

  describe('dateRange', () => {
    const group = (from: string | null, to: string | null) =>
      new FormGroup({ from: new FormControl(from), to: new FormControl(to) }, { validators: dateRange('from', 'to') });

    it('from after to fails', () => expect(group('2026-11-30', '2026-11-01').errors).toEqual({ dateRange: true }));
    it('same day is OK', () => expect(group('2026-11-01', '2026-11-01').errors).toBeNull());
    it('either empty is OK', () => {
      expect(group(null, '2026-11-01').errors).toBeNull();
      expect(group('2026-11-01', null).errors).toBeNull();
    });
  });

  describe('maxAmount', () => {
    it('equal is OK', () => expect(maxAmount(100)(new FormControl(100))).toBeNull());
    it('above fails', () => expect(maxAmount(100)(new FormControl(100.01))).toEqual({ maxAmount: { max: 100, actual: 100.01 } }));
    it('no max passes', () => expect(maxAmount(null)(new FormControl(1e9))).toBeNull());
  });

  describe('decimalPlaces(2)', () => {
    const v = decimalPlaces(2);
    it('1.234 fails', () => expect(v(new FormControl(1.234))).toEqual({ decimalPlaces: { max: 2 } }));
    it('1.23 and 12 are OK', () => {
      expect(v(new FormControl(1.23))).toBeNull();
      expect(v(new FormControl(12))).toBeNull();
    });
    it('empty passes', () => expect(v(new FormControl(null))).toBeNull());
  });

  describe('notBlank', () => {
    it('whitespace only fails', () => expect(notBlank(new FormControl('   '))).toEqual({ blank: true }));
    it('text and empty pass', () => {
      expect(notBlank(new FormControl(' a '))).toBeNull();
      expect(notBlank(new FormControl(''))).toBeNull();
    });
  });

  describe('date utils', () => {
    it('round-trips a local date', () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toIsoDate(fromIsoDate('2026-11-20'))).toBe('2026-11-20');
    });
    it('rejects malformed input', () => {
      expect(fromIsoDate('20-11-2026')).toBeNull();
      expect(toIsoDate(null)).toBeNull();
    });
  });
});
