import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, forkJoin, of, switchMap, tap } from 'rxjs';
import { AppError, isAccessError, isServerOrNetworkError } from '../../../core/http/app-error';
import { ClaimDetail } from '../../../core/models/claim.model';
import { StatusHistory } from '../../../core/models/history.model';
import { Message } from '../../../core/models/message.model';
import { MoneyPipe } from '../../pipes/money.pipe';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';
import { ErrorPanelComponent } from '../../ui/error-panel/error-panel.component';
import { LoadingComponent } from '../../ui/loading/loading.component';
import { StatusBadgeComponent } from '../../ui/status-badge/status-badge.component';
import { ClaimService } from '../claim.service';
import { MessageService } from '../message.service';
import { MessageThreadComponent } from '../message-thread/message-thread.component';
import { StatusTimelineComponent } from '../status-timeline/status-timeline.component';

export type ClaimDetailMode = 'claimant' | 'staff' | 'manager';

/**
 * Shared claim detail for all three roles (05 §2.5, F2): details, decision, messages and timeline.
 * The role-specific action panel is projected in with an `actions` attribute. Call `reload()` after every action.
 */
@Component({
  selector: 'app-claim-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MoneyPipe,
    StatusBadgeComponent,
    LoadingComponent,
    ErrorPanelComponent,
    EmptyStateComponent,
    MessageThreadComponent,
    StatusTimelineComponent,
  ],
  template: `
    <div class="top">
      <a mat-button [routerLink]="backLink()" data-testid="back"><mat-icon>arrow_back</mat-icon> Back</a>
      @if (claim(); as c) {
        <h1 data-testid="claim-number">{{ c.claimNumber }}</h1>
        <app-status-badge [status]="c.status" />
      }
    </div>

    @if (notFound()) {
      <app-empty-state
        icon="search_off"
        message="Claim not found"
        actionLabel="Back to list"
        (action)="goBack()"
        data-testid="not-found"
      />
    } @else if (error()) {
      <app-error-panel [message]="errorText()" (retry)="reload()" />
    } @else if (loading() && !claim()) {
      <app-loading label="Loading claim…" />
    }

    <div class="layout" [class.hidden]="!claim() || notFound() || error()" [class.with-actions]="mode() !== 'claimant'">
      @if (claim(); as c) {
        <div class="main">
          <mat-card class="section" data-testid="details">
            <mat-card-header><mat-card-title>Details</mat-card-title></mat-card-header>
            <mat-card-content>
              <dl class="grid">
                <dt>Type</dt><dd>{{ c.type }}</dd>
                <dt>Market</dt><dd>{{ c.market }}</dd>
                <dt>Policy</dt><dd>{{ c.policyNumber }}</dd>
                <dt>Incident</dt><dd>{{ c.incidentDate }}</dd>
                <dt>Location</dt><dd>{{ c.location }}</dd>
                <dt>Submitted</dt><dd>{{ c.createdAt | date: 'd MMM y, HH:mm' }}</dd>
                <dt>Estimated</dt><dd data-testid="estimated">{{ c.estimatedAmount | money: c.currency }}</dd>
                <dt>Assessed</dt><dd data-testid="assessed">{{ c.assessedAmount | money: c.currency }}</dd>
                <dt>Claimant</dt><dd>{{ c.claimant.displayName }}</dd>
                <dt>Assigned to</dt><dd data-testid="assigned-to">{{ c.assignedStaff?.displayName ?? 'Not assigned' }}</dd>
              </dl>
              <p class="description" data-testid="description">{{ c.description }}</p>
            </mat-card-content>
          </mat-card>

          @if (isClosed()) {
            <mat-card class="section decision" data-testid="decision">
              <mat-card-header><mat-card-title>Decision</mat-card-title></mat-card-header>
              <mat-card-content>
                @if (c.status === 'SETTLED') {
                  <p><strong>Settled {{ c.settledAmount | money: c.currency }}</strong></p>
                } @else {
                  <p><strong>Rejected</strong></p>
                }
                <p class="note">{{ c.decisionNote }}</p>
                @if (c.closedAt) {
                  <p class="muted">Closed {{ c.closedAt | date: 'd MMM y, HH:mm' }}</p>
                }
              </mat-card-content>
            </mat-card>
          }

          <mat-card class="section">
            <mat-card-header><mat-card-title>Messages</mat-card-title></mat-card-header>
            <mat-card-content>
              <app-message-thread
                [claimId]="c.id"
                [messages]="messages()"
                [canSend]="canSend()"
                [showClosedNote]="canMessage() && !canSend()"
                (sent)="onMessageSent($event)"
                (blocked)="reload()"
              />
            </mat-card-content>
          </mat-card>

          <mat-card class="section">
            <mat-card-header><mat-card-title>Timeline</mat-card-title></mat-card-header>
            <mat-card-content><app-status-timeline [history]="history()" /></mat-card-content>
          </mat-card>
        </div>
      }
      @if (mode() !== 'claimant') {
        <aside class="actions" data-testid="actions-panel">
          <mat-card class="section">
            <mat-card-header><mat-card-title>Actions</mat-card-title></mat-card-header>
            <mat-card-content><ng-content select="[actions]" /></mat-card-content>
          </mat-card>
        </aside>
      }
    </div>
  `,
  styles: `
    .top { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
    h1 { margin: 0; font-size: 22px; font-weight: 400; }
    .layout { display: grid; gap: var(--space-3); grid-template-columns: 1fr; }
    .layout.with-actions { grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); }
    .layout.hidden { display: none; }
    .main { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
    .grid { display: grid; grid-template-columns: max-content 1fr max-content 1fr; gap: var(--space-1) var(--space-3); margin: 0; }
    dt { color: #666; }
    dd { margin: 0; }
    .description { white-space: pre-wrap; margin-top: var(--space-3); }
    .note { white-space: pre-wrap; }
    .muted { color: #666; font-size: 13px; }
    @media (max-width: 900px) {
      .layout.with-actions { grid-template-columns: 1fr; }
      .grid { grid-template-columns: max-content 1fr; }
    }
  `,
})
export class ClaimDetailComponent implements OnInit {
  readonly claimId = input.required<number>();
  readonly mode = input.required<ClaimDetailMode>();
  readonly backLink = input('/');

  private readonly claims = inject(ClaimService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly claimId$ = toObservable(this.claimId);
  private readonly router = inject(Router);

  readonly claim = signal<ClaimDetail | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly history = signal<StatusHistory[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly error = signal(false);
  readonly errorText = signal<string | null>(null);

  readonly isClosed = computed(() => {
    const s = this.claim()?.status;
    return s === 'SETTLED' || s === 'REJECTED';
  });
  /** Only the claimant and the assigned staff member take part in the conversation. */
  readonly canMessage = computed(() => this.mode() === 'claimant' || this.mode() === 'staff');
  readonly canSend = computed(() => this.canMessage() && this.claim()?.status === 'IN_PROGRESS');

  ngOnInit(): void {
    combineLatest([this.claimId$, this.reload$])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(([id]) =>
          forkJoin({
            claim: this.claims.get(id),
            messages: this.messageService.list(id),
            history: this.claims.history(id),
          }).pipe(
            catchError((err: unknown) => {
              if (isAccessError(err)) {
                // 401 / 403: the error interceptor already showed the message and is navigating away.
              } else if (err instanceof AppError && err.status === 404) {
                this.notFound.set(true);
              } else {
                // 0 / 5xx: the interceptor showed the popup, so only Retry here. Anything else keeps its text.
                this.errorText.set(isServerOrNetworkError(err) ? null : "Couldn't load this claim.");
                this.error.set(true);
              }
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (result) {
          this.notFound.set(false);
          this.claim.set(result.claim);
          this.messages.set(result.messages);
          this.history.set(result.history);
        }
      });
  }

  reload(): void {
    this.reload$.next();
  }

  goBack(): void {
    void this.router.navigateByUrl(this.backLink());
  }

  onMessageSent(message: Message): void {
    this.messages.update((list) => [...list, message]);
  }
}
