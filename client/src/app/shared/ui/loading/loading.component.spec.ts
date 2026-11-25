import { TestBed } from '@angular/core/testing';
import { byTestId } from '../../../testing/test-helpers';
import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
  it('shows a spinner with an accessible label', () => {
    const fixture = TestBed.createComponent(LoadingComponent);
    fixture.componentRef.setInput('label', 'Loading claim…');
    fixture.detectChanges();
    const el = byTestId(fixture.nativeElement, 'loading');
    expect(el?.getAttribute('role')).toBe('status');
    expect(el?.getAttribute('aria-label')).toBe('Loading claim…');
    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
  });
});
