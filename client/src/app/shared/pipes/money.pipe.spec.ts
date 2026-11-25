import { MoneyPipe } from './money.pipe';

describe('MoneyPipe (T14)', () => {
  const pipe = new MoneyPipe();

  it('formats "MYR 6,200.00"', () => expect(pipe.transform(6200, 'MYR')).toBe('MYR 6,200.00'));
  it('keeps two decimals', () => expect(pipe.transform(5500.5, 'SGD')).toBe('SGD 5,500.50'));
  it('null gives an em dash', () => expect(pipe.transform(null, 'MYR')).toBe('—'));
  it('without a currency gives the number only', () => expect(pipe.transform(80000, null)).toBe('80,000.00'));
});
