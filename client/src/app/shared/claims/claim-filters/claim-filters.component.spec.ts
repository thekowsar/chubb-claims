import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ClaimFilter, EMPTY_FILTER } from '../../../core/models/claim.model';
import { byTestId } from '../../../testing/test-helpers';
import { ClaimFiltersComponent } from './claim-filters.component';

describe('ClaimFiltersComponent', () => {
  let fixture: ComponentFixture<ClaimFiltersComponent>;
  let applied: ClaimFilter[];
  let cleared: number;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(ClaimFiltersComponent);
    fixture.componentRef.setInput('value', EMPTY_FILTER);
    applied = [];
    cleared = 0;
    fixture.componentInstance.apply.subscribe((f) => applied.push(f));
    fixture.componentInstance.clear.subscribe(() => cleared++);
    fixture.detectChanges();
  });

  it('fills the form from the input filter', () => {
    fixture.componentRef.setInput('value', {
      status: ['SUBMITTED'],
      market: 'SG',
      type: 'PROPERTY',
      submittedFrom: '2026-11-01',
      submittedTo: '2026-11-30',
    } satisfies ClaimFilter);
    fixture.detectChanges();
    const v = fixture.componentInstance.form.getRawValue();
    expect(v.status).toEqual(['SUBMITTED']);
    expect(v.market).toBe('SG');
    expect(v.type).toBe('PROPERTY');
    expect(v.submittedFrom?.getDate()).toBe(1);
    expect(v.submittedTo?.getMonth()).toBe(10);
  });

  it('Apply emits the filter with YYYY-MM-DD dates', () => {
    fixture.componentInstance.form.setValue({
      status: ['ASSIGNED', 'IN_PROGRESS'],
      market: 'MY',
      type: null,
      submittedFrom: new Date(2026, 10, 1),
      submittedTo: null,
    });
    fixture.detectChanges();
    byTestId<HTMLButtonElement>(fixture.nativeElement, 'filter-apply')!.click();

    expect(applied).toEqual([
      { status: ['ASSIGNED', 'IN_PROGRESS'], market: 'MY', type: null, submittedFrom: '2026-11-01', submittedTo: null },
    ]);
  });

  it('from after to shows an error and disables Apply', () => {
    fixture.componentInstance.form.patchValue({ submittedFrom: new Date(2026, 10, 30), submittedTo: new Date(2026, 10, 1) });
    fixture.detectChanges();

    expect(byTestId(fixture.nativeElement, 'filter-date-error')).not.toBeNull();
    expect(byTestId<HTMLButtonElement>(fixture.nativeElement, 'filter-apply')!.disabled).toBeTrue();
    fixture.componentInstance.submit();
    expect(applied.length).toBe(0);
  });

  it('Clear resets the form and emits clear', () => {
    fixture.componentInstance.form.patchValue({ market: 'HK' });
    byTestId<HTMLButtonElement>(fixture.nativeElement, 'filter-clear')!.click();
    expect(cleared).toBe(1);
    expect(fixture.componentInstance.form.getRawValue().market).toBeNull();
  });
});
