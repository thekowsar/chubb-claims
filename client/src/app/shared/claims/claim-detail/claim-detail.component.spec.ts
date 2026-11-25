import { Component } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { ClaimDetail } from '../../../core/models/claim.model';
import { Message } from '../../../core/models/message.model';
import {
  allByTestId,
  byTestId,
  envelope,
  errorEnvelope,
  makeClaim,
  makeHistory,
  makeMessage,
  provideApiTesting,
} from '../../../testing/test-helpers';
import { ClaimDetailComponent, ClaimDetailMode } from './claim-detail.component';

@Component({
  standalone: true,
  imports: [ClaimDetailComponent],
  template: `
    <app-claim-detail [claimId]="id" [mode]="mode" backLink="/staff/queue">
      <button actions data-testid="projected-action">Do it</button>
    </app-claim-detail>
  `,
})
class HostComponent {
  id = 4;
  mode: ClaimDetailMode = 'staff';
}

describe('ClaimDetailComponent (T19)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;
  const detail = () =>
    fixture.debugElement.query((d) => d.componentInstance instanceof ClaimDetailComponent).componentInstance as ClaimDetailComponent;

  function open(mode: ClaimDetailMode, claim: ClaimDetail = makeClaim(), messages: Message[] = [makeMessage()]): void {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.mode = mode;
    fixture.detectChanges();
    flushLoad(claim, messages);
  }

  function flushLoad(claim: ClaimDetail, messages: Message[] = [makeMessage()]): void {
    http.expectOne('/api/claims/4').flush(envelope(claim));
    http.expectOne('/api/claims/4/messages').flush(envelope(messages));
    http.expectOne('/api/claims/4/history').flush(envelope(makeHistory()));
    fixture.detectChanges();
  }

  it('shows a spinner while loading', () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(byTestId(el(), 'loading')).not.toBeNull();
    flushLoad(makeClaim());
    expect(byTestId(el(), 'loading')).toBeNull();
  });

  it('shows the details, messages and timeline', () => {
    open('staff');
    expect(byTestId(el(), 'claim-number')?.textContent).toBe('CLM-2026-000004');
    expect(byTestId(el(), 'status-badge')?.textContent?.trim()).toBe('In progress');
    expect(byTestId(el(), 'estimated')?.textContent).toBe('MYR 6,200.00');
    expect(byTestId(el(), 'assessed')?.textContent).toBe('MYR 5,800.00');
    expect(byTestId(el(), 'assigned-to')?.textContent).toBe('Chris Lim');
    expect(byTestId(el(), 'description')?.textContent).toContain('Rear bumper');
    expect(allByTestId(el(), 'message').length).toBe(1);
    expect(allByTestId(el(), 'timeline-item').length).toBe(2);
    expect(byTestId(el(), 'decision')).toBeNull();
  });

  it('shows the decision for a settled claim', () => {
    open('claimant', makeClaim({ status: 'SETTLED', settledAmount: 5500, decisionNote: 'Approved, excess applied.', closedAt: '2026-11-21T00:00:00Z' }));
    const decision = byTestId(el(), 'decision')!;
    expect(decision.textContent).toContain('Settled MYR 5,500.00');
    expect(decision.textContent).toContain('Approved, excess applied.');
  });

  it('shows the decision for a rejected claim', () => {
    open('manager', makeClaim({ status: 'REJECTED', decisionNote: 'Not covered.' }));
    expect(byTestId(el(), 'decision')?.textContent).toContain('Rejected');
    expect(byTestId(el(), 'decision')?.textContent).toContain('Not covered.');
  });

  for (const mode of ['claimant', 'staff'] as const) {
    it(`${mode}: message box shows while IN_PROGRESS`, () => {
      open(mode);
      expect(byTestId(el(), 'message-input')).not.toBeNull();
    });

    it(`${mode}: outside IN_PROGRESS the box is replaced by the note`, () => {
      open(mode, makeClaim({ status: 'ASSIGNED' }));
      expect(byTestId(el(), 'message-input')).toBeNull();
      expect(byTestId(el(), 'messaging-closed')).not.toBeNull();
    });
  }

  it('manager: messages are read only, with no note', () => {
    open('manager');
    expect(allByTestId(el(), 'message').length).toBe(1);
    expect(byTestId(el(), 'message-input')).toBeNull();
    expect(byTestId(el(), 'messaging-closed')).toBeNull();
  });

  it('the action panel shows projected content for staff and manager, not for a claimant', () => {
    open('staff');
    expect(byTestId(el(), 'actions-panel')).not.toBeNull();
    expect(byTestId(el(), 'projected-action')).not.toBeNull();

    fixture.destroy();
    open('claimant');
    expect(byTestId(el(), 'actions-panel')).toBeNull();
  });

  it('sending appends the message to the list', () => {
    open('staff');
    detail().onMessageSent(makeMessage({ id: 2, body: 'New one' }));
    fixture.detectChanges();
    expect(allByTestId(el(), 'message').length).toBe(2);
  });

  it('reload() fetches the claim, messages and history again', () => {
    open('staff', makeClaim({ status: 'ASSIGNED' }));
    detail().reload();
    flushLoad(makeClaim({ status: 'IN_PROGRESS' }));
    expect(byTestId(el(), 'status-badge')?.textContent?.trim()).toBe('In progress');
  });

  it('404 shows "Claim not found" with a Back link', async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    http.expectOne('/api/claims/4').flush(errorEnvelope('CLAIM_NOT_FOUND', 'Claim 4 not found'), { status: 404, statusText: 'nf' });
    http.match('/api/claims/4/messages');
    http.match('/api/claims/4/history');
    fixture.detectChanges();

    expect(byTestId(el(), 'empty-text')?.textContent).toBe('Claim not found');
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    byTestId<HTMLButtonElement>(el(), 'empty-action')!.click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/staff/queue');
  });

  it('403 shows no panel of its own (the error interceptor reports it)', () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    http.expectOne('/api/claims/4').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    http.match('/api/claims/4/messages');
    http.match('/api/claims/4/history');
    fixture.detectChanges();

    expect(byTestId(el(), 'error-panel')).toBeNull();
    expect(byTestId(el(), 'empty-state')).toBeNull();
    expect(byTestId(el(), 'loading')).toBeNull();
  });

  it('other errors show the ErrorPanel, and Retry loads again', () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    http.expectOne('/api/claims/4').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'err' });
    http.match('/api/claims/4/messages');
    http.match('/api/claims/4/history');
    fixture.detectChanges();
    expect(byTestId(el(), 'error-panel')).not.toBeNull();
    expect(byTestId(el(), 'error-text')).toBeNull(); // the interceptor popup is the one message

    byTestId<HTMLButtonElement>(el(), 'retry')!.click();
    flushLoad(makeClaim());
    expect(byTestId(el(), 'error-panel')).toBeNull();
    expect(byTestId(el(), 'claim-number')).not.toBeNull();
  });
});
