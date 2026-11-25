import { TestBed } from '@angular/core/testing';
import { byTestId } from '../../../testing/test-helpers';
import { ErrorPanelComponent } from './error-panel.component';

describe('ErrorPanelComponent', () => {
  it('without a message shows only Retry, with no text and no alert role', () => {
    const fixture = TestBed.createComponent(ErrorPanelComponent);
    fixture.detectChanges();
    expect(byTestId(fixture.nativeElement, 'retry')).not.toBeNull();
    expect(byTestId(fixture.nativeElement, 'error-text')).toBeNull();
    expect(byTestId(fixture.nativeElement, 'error-panel')?.getAttribute('role')).toBeNull();
  });

  it('shows the message and emits retry', () => {
    const fixture = TestBed.createComponent(ErrorPanelComponent);
    fixture.componentRef.setInput('message', "Couldn't load claims.");
    fixture.detectChanges();
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);

    expect(byTestId(fixture.nativeElement, 'error-text')?.textContent).toBe("Couldn't load claims.");
    expect(byTestId(fixture.nativeElement, 'error-panel')?.getAttribute('role')).toBe('alert');
    byTestId<HTMLButtonElement>(fixture.nativeElement, 'retry')?.click();
    expect(retried).toBe(1);
  });
});
