import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, of, switchMap, tap } from 'rxjs';
import { isAccessError, isServerOrNetworkError } from '../../../core/http/app-error';
import { Dashboard, DashboardPeriod } from '../../../core/models/dashboard.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ErrorPanelComponent } from '../../../shared/ui/error-panel/error-panel.component';
import { DashboardService } from './dashboard.service';
import { StatusPieChartComponent } from './status-pie-chart/status-pie-chart.component';
import { WorkloadBarChartComponent } from './workload-bar-chart/workload-bar-chart.component';

/**
 * Screen 8: manager dashboard (05 §2.7). Period WEEK / MONTH / ALL drives the counts, pie and settled totals.
 * Unassigned, workload and liability are a "now" snapshot (04 A6).
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MoneyPipe,
    ErrorPanelComponent,
    StatusPieChartComponent,
    WorkloadBarChartComponent,
  ],
  template: `
    <div class="header">
      <h1 data-testid="page-title">Dashboard</h1>
      <div class="controls">
        <mat-button-toggle-group
          [value]="period()"
          (change)="period.set($event.value)"
          aria-label="Period"
          data-testid="period"
        >
          <mat-button-toggle value="WEEK" data-testid="period-WEEK">This week</mat-button-toggle>
          <mat-button-toggle value="MONTH" data-testid="period-MONTH">This month</mat-button-toggle>
          <mat-button-toggle value="ALL" data-testid="period-ALL">All</mat-button-toggle>
        </mat-button-toggle-group>
        <button mat-icon-button type="button" aria-label="Refresh" data-testid="refresh" (click)="refresh()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" data-testid="dashboard-loading" />
    }

    @if (error()) {
      <app-error-panel [message]="errorText()" (retry)="refresh()" />
    } @else {
      @if (data(); as d) {
      <div class="cards">
        <a class="card link" routerLink="/manager/claims" [queryParams]="{ status: 'SUBMITTED' }" data-testid="card-unassigned">
          <span class="label">Unassigned <small>(now)</small></span>
          <span class="value">{{ d.unassignedCount }}</span>
        </a>
        <div class="card" data-testid="card-submitted">
          <span class="label">Submitted <small>(period)</small></span>
          <span class="value">{{ d.submittedCount }}</span>
        </div>
        <div class="card" data-testid="card-settled">
          <span class="label">Settled <small>(period)</small></span>
          <span class="value">{{ d.closedCounts.settled }}</span>
        </div>
        <div class="card" data-testid="card-rejected">
          <span class="label">Rejected <small>(period)</small></span>
          <span class="value">{{ d.closedCounts.rejected }}</span>
        </div>
      </div>

      <div class="grid">
        <mat-card>
          <mat-card-header><mat-card-title>Claims by status <small>(period)</small></mat-card-title></mat-card-header>
          <mat-card-content><app-status-pie-chart [counts]="d.countsByStatus" /></mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header><mat-card-title>Workload per staff <small>(now)</small></mat-card-title></mat-card-header>
          <mat-card-content><app-workload-bar-chart [workload]="d.workload" /></mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header><mat-card-title>Outstanding liability <small>(now)</small></mat-card-title></mat-card-header>
          <mat-card-content>
            @if (d.outstandingLiability.length === 0) {
              <p class="empty" data-testid="liability-empty">No open claims</p>
            } @else {
              <table class="data" data-testid="liability-table">
                <thead>
                  <tr><th>Market</th><th>Currency</th><th class="num">Amount</th><th class="num">Open</th></tr>
                </thead>
                <tbody>
                  @for (row of d.outstandingLiability; track row.market + row.currency) {
                    <tr data-testid="liability-row">
                      <td>{{ row.market }}</td>
                      <td>{{ row.currency }}</td>
                      <td class="num">{{ row.amount | money: null }}</td>
                      <td class="num">{{ row.openClaimCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </mat-card-content>
        </mat-card>
        <mat-card>
          <mat-card-header><mat-card-title>Settled totals <small>(period)</small></mat-card-title></mat-card-header>
          <mat-card-content>
            @if (d.settledTotals.length === 0) {
              <p class="empty" data-testid="settled-empty">No claims in this period</p>
            } @else {
              <ul class="totals" data-testid="settled-totals">
                @for (t of d.settledTotals; track t.currency) {
                  <li data-testid="settled-row">{{ t.amount | money: t.currency }}</li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>
      </div>
      <p class="generated">Updated {{ d.generatedAt | date: 'd MMM y, HH:mm:ss' }}</p>
      }
    }
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
    h1 { margin: 0; font-size: 24px; font-weight: 400; }
    .controls { display: flex; align-items: center; gap: var(--space-2); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); margin: var(--space-3) 0; }
    .card { display: flex; flex-direction: column; padding: var(--space-3); border-radius: 8px; background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15); color: inherit; text-decoration: none; }
    .card.link:hover { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25); }
    .label { color: #666; font-size: 13px; }
    .value { font-size: 32px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--space-3); }
    .data { width: 100%; border-collapse: collapse; }
    .data th, .data td { padding: 4px 8px; border-bottom: 1px solid #eee; text-align: left; }
    .num { text-align: right !important; }
    .totals { margin: 0; padding-left: var(--space-3); }
    .empty, .generated { color: #666; }
    small { color: #888; font-weight: 400; font-size: 12px; }
  `,
})
export class DashboardPage implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  readonly period = signal<DashboardPeriod>('ALL');
  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly errorText = signal<string | null>(null);
  private readonly period$ = toObservable(this.period);

  ngOnInit(): void {
    combineLatest([this.period$, this.refresh$])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap(([period]) =>
          this.dashboard.get(period).pipe(
            catchError((err: unknown) => {
              // 401 / 403: the interceptor reported it and navigates away. 0 / 5xx: popup there, Retry only here.
              this.errorText.set(isServerOrNetworkError(err) ? null : "Couldn't load the dashboard.");
              this.error.set(!isAccessError(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((d) => {
        this.loading.set(false);
        if (d) {
          this.data.set(d);
        }
      });
  }

  refresh(): void {
    this.refresh$.next();
  }
}
