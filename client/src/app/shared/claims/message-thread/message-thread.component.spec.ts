import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Message } from '../../../core/models/message.model';
import { allByTestId, byTestId, envelope, errorEnvelope, makeMessage, provideApiTesting } from '../../../testing/test-helpers';
import { MessageThreadComponent } from './message-thread.component';

describe('MessageThreadComponent', () => {
  let fixture: ComponentFixture<MessageThreadComponent>;
  let http: HttpTestingController;

  function create(messages: Message[], canSend: boolean, showClosedNote = false): HTMLElement {
    fixture = TestBed.createComponent(MessageThreadComponent);
    fixture.componentRef.setInput('claimId', 4);
    fixture.componentRef.setInput('messages', messages);
    fixture.componentRef.setInput('canSend', canSend);
    fixture.componentRef.setInput('showClosedNote', showClosedNote);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideApiTesting(), provideNoopAnimations()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists messages with author and role', () => {
    const el = create([makeMessage(), makeMessage({ id: 2, author: { id: 2, displayName: 'Ben Wong' }, authorRole: 'CLAIMANT', body: 'WS-88412' })], false);
    const rows = allByTestId(el, 'message');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Chris Lim');
    expect(rows[0].textContent).toContain('(staff)');
    expect(rows[1].textContent).toContain('(claimant)');
    expect(rows[1].textContent).toContain('WS-88412');
  });

  it('shows "No messages yet." when empty', () => {
    expect(byTestId(create([], false), 'no-messages')?.textContent).toContain('No messages yet.');
  });

  it('hides the send box when it cannot send, and shows the closed note when asked', () => {
    const el = create([], false, true);
    expect(byTestId(el, 'message-input')).toBeNull();
    expect(byTestId(el, 'messaging-closed')?.textContent).toContain('while the claim is in progress');
  });

  it('Send is disabled for empty or whitespace text', () => {
    const el = create([], true);
    const send = byTestId<HTMLButtonElement>(el, 'message-send')!;
    expect(send.disabled).toBeTrue();
    fixture.componentInstance.form.controls.body.setValue('   ');
    fixture.detectChanges();
    expect(send.disabled).toBeTrue();
  });

  it('sends the trimmed body, emits sent and clears the box', () => {
    const el = create([], true);
    const sent: Message[] = [];
    fixture.componentInstance.sent.subscribe((m) => sent.push(m));
    fixture.componentInstance.form.controls.body.setValue('  Hello there  ');
    fixture.detectChanges();

    byTestId<HTMLButtonElement>(el, 'message-send')!.click();
    const req = http.expectOne('/api/claims/4/messages');
    expect(req.request.body).toEqual({ body: 'Hello there' });
    req.flush(envelope(makeMessage({ id: 9, body: 'Hello there' })));

    expect(sent.map((m) => m.id)).toEqual([9]);
    expect(fixture.componentInstance.form.controls.body.value).toBe('');
  });

  it('Enter sends and Shift+Enter does not', () => {
    const el = create([], true);
    fixture.componentInstance.form.controls.body.setValue('Hi');
    const input = byTestId<HTMLTextAreaElement>(el, 'message-input')!;

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    http.expectNone('/api/claims/4/messages');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const req = http.expectOne('/api/claims/4/messages');
    expect(req.request.body).toEqual({ body: 'Hi' });
    req.flush(envelope(makeMessage()));
  });

  it('a 500 or network error shows no inline error (the interceptor popup is the one message) and keeps the text', () => {
    const el = create([], true);
    fixture.componentInstance.form.controls.body.setValue('Hi');
    fixture.componentInstance.send();
    http.expectOne('/api/claims/4/messages').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(byTestId(el, 'message-error')).toBeNull();
    expect(fixture.componentInstance.form.controls.body.value).toBe('Hi');

    fixture.componentInstance.send();
    http.expectOne('/api/claims/4/messages').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(byTestId(el, 'message-error')).toBeNull();
  });

  it('a 403 shows no inline error (the error interceptor reports it)', () => {
    const el = create([], true);
    fixture.componentInstance.form.controls.body.setValue('Hi');
    fixture.componentInstance.send();
    http.expectOne('/api/claims/4/messages').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(byTestId(el, 'message-error')).toBeNull();
    expect(fixture.componentInstance.sending()).toBeFalse();
  });

  it('MESSAGING_NOT_ALLOWED shows an inline note and emits blocked', () => {
    const el = create([], true);
    let blocked = false;
    fixture.componentInstance.blocked.subscribe(() => (blocked = true));
    fixture.componentInstance.form.controls.body.setValue('Hi');
    fixture.componentInstance.send();

    http.expectOne('/api/claims/4/messages').flush(errorEnvelope('MESSAGING_NOT_ALLOWED', 'Claim is not in progress'), {
      status: 409,
      statusText: 'Conflict',
    });
    fixture.detectChanges();

    expect(blocked).toBeTrue();
    expect(byTestId(el, 'message-error')?.textContent).toContain('no longer in progress');
  });
});
