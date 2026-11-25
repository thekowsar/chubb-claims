import { TestBed } from '@angular/core/testing';
import { byTestId } from '../../../testing/test-helpers';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('shows the message and no button without an action label', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'No claims yet.');
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'empty-text')?.textContent).toBe('No claims yet.');
    expect(byTestId(fixture.nativeElement, 'empty-action')).toBeNull();
  });

  it('emits action when the button is clicked', () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('message', 'x');
    fixture.componentRef.setInput('actionLabel', 'Clear filters');
    fixture.detectChanges();
    let clicked = false;
    fixture.componentInstance.action.subscribe(() => (clicked = true));

    const button = byTestId<HTMLButtonElement>(fixture.nativeElement, 'empty-action');
    expect(button?.textContent?.trim()).toBe('Clear filters');
    button?.click();
    expect(clicked).toBeTrue();
  });
});
