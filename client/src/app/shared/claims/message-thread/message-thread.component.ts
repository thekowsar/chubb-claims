import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppError, isHandledGlobally } from '../../../core/http/app-error';
import { Message } from '../../../core/models/message.model';
import { RoleCode } from '../../../core/models/user.model';
import { notBlank } from '../../validators/not-blank.validator';
import { MessageService } from '../message.service';

const ROLE_LABEL: Record<RoleCode, string> = { CLAIMANT: 'claimant', CLAIMS_STAFF: 'staff', MANAGER: 'manager' };

/**
 * Message list plus the send box (05 §2.5). The box shows only when `canSend` (CLAIMANT or STAFF, claim IN_PROGRESS).
 * Enter sends, Shift+Enter adds a new line.
 */
@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="messages" data-testid="messages">
      @for (m of messages(); track m.id) {
        <div class="message" data-testid="message">
          <div class="meta">
            <strong>{{ m.author.displayName }}</strong>
            <span class="role">({{ roleLabel[m.authorRole] }})</span>
            <span class="when">{{ m.createdAt | date: 'd MMM, HH:mm' }}</span>
          </div>
          <div class="body">{{ m.body }}</div>
        </div>
      } @empty {
        <p class="none" data-testid="no-messages">No messages yet.</p>
      }
    </div>

    @if (canSend()) {
      <form class="send" [formGroup]="form" (ngSubmit)="send()" novalidate>
        <mat-form-field appearance="outline" class="field" subscriptSizing="dynamic">
          <mat-label>Type a message…</mat-label>
          <textarea
            matInput
            formControlName="body"
            rows="2"
            maxlength="2000"
            data-testid="message-input"
            (keydown.enter)="onEnter($any($event))"
          ></textarea>
          @if (form.controls.body.hasError('maxlength')) {
            <mat-error>At most 2000 characters</mat-error>
          }
        </mat-form-field>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          data-testid="message-send"
          [disabled]="form.invalid || sending()"
        >
          Send
        </button>
      </form>
      @if (sendError()) {
        <p class="error" role="alert" data-testid="message-error">{{ sendError() }}</p>
      }
    } @else if (showClosedNote()) {
      <p class="note" data-testid="messaging-closed">Messaging is available while the claim is in progress.</p>
    }
  `,
  styles: `
    .messages { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }
    .message { padding: var(--space-2) var(--space-3); background: #f5f5f5; border-radius: 6px; }
    .meta { display: flex; gap: var(--space-2); align-items: baseline; font-size: 13px; }
    .role, .when { color: #666; }
    .body { white-space: pre-wrap; margin-top: 2px; }
    .send { display: flex; gap: var(--space-2); align-items: flex-start; }
    .field { flex: 1; }
    .none, .note { color: #666; }
    .error { color: var(--status-rejected); }
  `,
})
export class MessageThreadComponent {
  readonly claimId = input.required<number>();
  readonly messages = input.required<Message[]>();
  readonly canSend = input(false);
  /** Show "Messaging is available while…" when the user could message but the status doesn't allow it. */
  readonly showClosedNote = input(false);
  readonly sent = output<Message>();
  /** MESSAGING_NOT_ALLOWED: the claim moved on, so the parent should reload. */
  readonly blocked = output<void>();

  private readonly messageService = inject(MessageService);
  protected readonly roleLabel = ROLE_LABEL;
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(2000), notBlank]],
  });

  onEnter(event: KeyboardEvent): void {
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.send();
  }

  send(): void {
    if (this.form.invalid || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    this.messageService.send(this.claimId(), this.form.getRawValue().body.trim()).subscribe({
      next: (message) => {
        this.sending.set(false);
        this.form.reset({ body: '' });
        this.sent.emit(message);
      },
      error: (err: unknown) => {
        this.sending.set(false);
        if (isHandledGlobally(err)) {
          return; // the error interceptor already showed the message
        }
        if (err instanceof AppError && err.code === 'MESSAGING_NOT_ALLOWED') {
          this.sendError.set('This claim is no longer in progress, so messages are closed.');
          this.blocked.emit();
        } else if (err instanceof AppError && err.status === 400) {
          this.sendError.set(err.details[0]?.message ?? err.message);
        } else {
          this.sendError.set('The message was not sent. Please try again.');
        }
      },
    });
  }
}
