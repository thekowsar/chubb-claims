import { TestBed } from '@angular/core/testing';
import { ClaimStatus } from '../../../core/models/claim.model';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent (T14)', () => {
  const cases: [ClaimStatus, string, string][] = [
    ['SUBMITTED', 'Submitted', 'status-submitted'],
    ['ASSIGNED', 'Assigned', 'status-assigned'],
    ['IN_PROGRESS', 'In progress', 'status-in-progress'],
    ['SETTLED', 'Settled', 'status-settled'],
    ['REJECTED', 'Rejected', 'status-rejected'],
  ];
  for (const [status, label, css] of cases) {
    it(`${status} shows "${label}" with class ${css}`, () => {
      const fixture = TestBed.createComponent(StatusBadgeComponent);
      fixture.componentRef.setInput('status', status);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement.querySelector('[data-testid="status-badge"]');
      expect(el.textContent?.trim()).toBe(label);
      expect(el.classList).toContain(css);
      expect(el.classList).toContain('badge');
    });
  }
});
