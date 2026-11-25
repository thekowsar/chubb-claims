import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, ParamMap, Params, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';
import {
  CLAIM_STATUSES,
  CLAIM_TYPES,
  ClaimFilter,
  ClaimStatus,
  ClaimSummary,
  ClaimType,
  DEFAULT_PAGE,
  MARKETS,
  Market,
  Page,
  PageRequest,
  isFilterEmpty,
} from '../../../core/models/claim.model';
import { MoneyPipe } from '../../pipes/money.pipe';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';
import { ErrorPanelComponent } from '../../ui/error-panel/error-panel.component';
import { StatusBadgeComponent } from '../../ui/status-badge/status-badge.component';
import { ClaimFiltersComponent } from '../claim-filters/claim-filters.component';
import { ClaimService } from '../claim.service';
import { isAccessError, isServerOrNetworkError } from '../../../core/http/app-error';

export type ClaimListMode = 'claimant' | 'staff' | 'manager';

const DETAIL_PREFIX: Record<ClaimListMode, string> = {
  claimant: '/claimant/claims',
  staff: '/staff/claims',
  manager: '/manager/claims',
};

const SORTABLE = ['createdAt', 'updatedAt', 'incidentDate', 'estimatedAmount', 'claimNumber', 'status'];

interface ListQuery {
  filter: ClaimFilter;
  page: PageRequest;
  /** True when the URL has no filter params, so the mode's default statuses apply. */
  usingDefaults: boolean;
}

/**
 * Shared claim table for My claims, My work queue and All claims (05 §2.3).
 * Filters, page, size and sort live in the URL query params, so refresh, Back and shared links work (05 §7.1).
 */
@Component({
  selector: 'app-claim-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MoneyPipe,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorPanelComponent,
    ClaimFiltersComponent,
  ],
  template: `
    <div class="header">
      <h1 data-testid="page-title">{{ title() }}</h1>
      @if (mode() === 'claimant') {
        <a mat-flat-button color="primary" routerLink="/claimant/claims/new" data-testid="new-claim">
          <mat-icon>add</mat-icon> New claim
        </a>
      }
    </div>

    <app-claim-filters [value]="filter()" (apply)="applyFilter($event)" (clear)="clearFilters()" />

    @if (error()) {
      <app-error-panel [message]="errorText()" (retry)="retry()" />
    } @else {
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" data-testid="list-loading" />
        @if (!data()) {
          <div class="skeleton" data-testid="skeleton">
            @for (row of skeletonRows; track row) {
              <div class="skeleton-row"></div>
            }
          </div>
        }
      }
      @if (data(); as page) {
        @if (page.items.length === 0) {
          <app-empty-state
            [message]="emptyText()"
            [actionLabel]="emptyAction()"
            (action)="onEmptyAction()"
          />
        } @else {
          <table
            mat-table
            [dataSource]="page.items"
            matSort
            [matSortActive]="sortField()"
            [matSortDirection]="sortDirection()"
            matSortDisableClear
            (matSortChange)="onSort($event)"
            class="table"
            data-testid="claims-table"
          >
            <ng-container matColumnDef="claimNumber">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Claim no.</th>
              <td mat-cell *matCellDef="let c">
                <a [routerLink]="[detailPrefix(), c.id]" data-testid="claim-link">{{ c.claimNumber }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let c">{{ c.type }}</td>
            </ng-container>
            <ng-container matColumnDef="market">
              <th mat-header-cell *matHeaderCellDef>Market</th>
              <td mat-cell *matCellDef="let c">{{ c.market }}</td>
            </ng-container>
            <ng-container matColumnDef="claimant">
              <th mat-header-cell *matHeaderCellDef>Claimant</th>
              <td mat-cell *matCellDef="let c">{{ c.claimant.displayName }}</td>
            </ng-container>
            <ng-container matColumnDef="assignedStaff">
              <th mat-header-cell *matHeaderCellDef>Assigned to</th>
              <td mat-cell *matCellDef="let c">{{ c.assignedStaff?.displayName ?? '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="incidentDate">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Incident</th>
              <td mat-cell *matCellDef="let c">{{ c.incidentDate }}</td>
            </ng-container>
            <ng-container matColumnDef="estimatedAmount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header arrowPosition="before" class="num">Estimated</th>
              <td mat-cell *matCellDef="let c" class="num">{{ c.estimatedAmount | money: c.currency }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let c"><app-status-badge [status]="c.status" /></td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Submitted</th>
              <td mat-cell *matCellDef="let c">{{ c.createdAt | date: 'd MMM y' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr mat-row *matRowDef="let row; columns: columns()" data-testid="claim-row"></tr>
          </table>
        }
        <mat-paginator
          [length]="page.totalElements"
          [pageIndex]="page.page"
          [pageSize]="pageRequest().size"
          [pageSizeOptions]="[10, 20, 50]"
          showFirstLastButtons
          (page)="onPage($event)"
          data-testid="paginator"
        />
      }
    }
  `,
  styles: `
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
    h1 { margin: 0; font-size: 24px; font-weight: 400; }
    .table { width: 100%; }
    .num { text-align: right; }
    .skeleton-row { height: 40px; margin: 6px 0; border-radius: 4px; background: #eee; }
  `,
})
export class ClaimListComponent implements OnInit {
  readonly mode = input.required<ClaimListMode>();
  readonly title = input.required<string>();
  /** Statuses used when the URL has no filters (the staff queue uses ASSIGNED + IN_PROGRESS). */
  readonly defaultStatuses = input<ClaimStatus[]>([]);

  private readonly claims = inject(ClaimService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  readonly filter = signal<ClaimFilter>({ status: [], market: null, type: null, submittedFrom: null, submittedTo: null });
  readonly pageRequest = signal<PageRequest>(DEFAULT_PAGE);
  readonly usingDefaults = signal(true);
  readonly data = signal<Page<ClaimSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly errorText = signal<string | null>(null);

  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly columns = computed(() =>
    this.mode() === 'claimant'
      ? ['claimNumber', 'type', 'market', 'incidentDate', 'estimatedAmount', 'status', 'createdAt']
      : ['claimNumber', 'type', 'market', 'claimant', 'assignedStaff', 'incidentDate', 'estimatedAmount', 'status', 'createdAt'],
  );
  readonly detailPrefix = computed(() => DETAIL_PREFIX[this.mode()]);
  readonly sortField = computed(() => this.pageRequest().sort.split(',')[0]);
  readonly sortDirection = computed(() => (this.pageRequest().sort.split(',')[1] === 'asc' ? 'asc' : 'desc'));

  readonly emptyText = computed(() => {
    const f = this.filter();
    const mode = this.mode();
    if (mode === 'claimant' && this.usingDefaults()) return "You haven't submitted any claims yet.";
    if (mode === 'staff' && this.usingDefaults()) return 'No claims are assigned to you right now.';
    if (mode === 'manager' && this.isOnlySubmitted(f)) return 'No unassigned claims 🎉';
    if (mode === 'manager' && isFilterEmpty(f)) return 'No claims yet.';
    return 'No claims match these filters.';
  });
  readonly emptyAction = computed(() => {
    if (this.mode() === 'claimant' && this.usingDefaults()) return '+ New claim';
    return this.usingDefaults() ? null : 'Clear filters';
  });

  ngOnInit(): void {
    combineLatest([this.route.queryParamMap, this.retry$])
      .pipe(
        map(([params]) => this.parse(params)),
        tap((q) => {
          this.filter.set(q.filter);
          this.pageRequest.set(q.page);
          this.usingDefaults.set(q.usingDefaults);
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((q) =>
          this.claims.search(q.filter, q.page).pipe(
            catchError((err: unknown) => {
              // 401 / 403: the interceptor reported it and navigates away. 0 / 5xx: popup there, Retry only here.
              this.errorText.set(isServerOrNetworkError(err) ? null : "Couldn't load claims.");
              this.error.set(!isAccessError(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.loading.set(false);
        if (page) {
          this.data.set(page);
        }
      });
  }

  applyFilter(filter: ClaimFilter): void {
    // A new filter always starts again at page 0.
    this.navigate(filter, { ...this.pageRequest(), page: 0 });
  }

  clearFilters(): void {
    this.navigate(null, { ...this.pageRequest(), page: 0 });
  }

  onPage(event: PageEvent): void {
    this.navigate(this.urlFilter(), { ...this.pageRequest(), page: event.pageIndex, size: event.pageSize });
  }

  onSort(sort: Sort): void {
    const direction = sort.direction || 'desc';
    this.navigate(this.urlFilter(), { ...this.pageRequest(), page: 0, sort: `${sort.active},${direction}` });
  }

  retry(): void {
    this.retry$.next();
  }

  onEmptyAction(): void {
    if (this.mode() === 'claimant' && this.usingDefaults()) {
      void this.router.navigateByUrl('/claimant/claims/new');
    } else {
      this.clearFilters();
    }
  }

  /** The filter as it should appear in the URL: null while the mode's defaults are in use. */
  private urlFilter(): ClaimFilter | null {
    return this.usingDefaults() ? null : this.filter();
  }

  private navigate(filter: ClaimFilter | null, page: PageRequest): void {
    const queryParams: Params = {};
    if (filter) {
      if (filter.status.length) queryParams['status'] = filter.status;
      if (filter.market) queryParams['market'] = filter.market;
      if (filter.type) queryParams['type'] = filter.type;
      if (filter.submittedFrom) queryParams['submittedFrom'] = filter.submittedFrom;
      if (filter.submittedTo) queryParams['submittedTo'] = filter.submittedTo;
    }
    if (page.page !== DEFAULT_PAGE.page) queryParams['page'] = page.page;
    if (page.size !== DEFAULT_PAGE.size) queryParams['size'] = page.size;
    if (page.sort !== DEFAULT_PAGE.sort) queryParams['sort'] = page.sort;
    void this.router.navigate([], { relativeTo: this.route, queryParams });
  }

  private parse(params: ParamMap): ListQuery {
    const status = params.getAll('status').filter((s): s is ClaimStatus => CLAIM_STATUSES.includes(s as ClaimStatus));
    const market = params.get('market');
    const type = params.get('type');
    const filter: ClaimFilter = {
      status,
      market: MARKETS.includes(market as Market) ? (market as Market) : null,
      type: CLAIM_TYPES.includes(type as ClaimType) ? (type as ClaimType) : null,
      submittedFrom: params.get('submittedFrom'),
      submittedTo: params.get('submittedTo'),
    };
    const usingDefaults = isFilterEmpty(filter);
    if (usingDefaults && this.defaultStatuses().length) {
      filter.status = [...this.defaultStatuses()];
    }
    const sort = params.get('sort');
    const sortOk = !!sort && SORTABLE.includes(sort.split(',')[0]) && /,(asc|desc)$/.test(sort);
    const page: PageRequest = {
      page: Math.max(0, Number(params.get('page') ?? DEFAULT_PAGE.page) || 0),
      size: Math.min(100, Math.max(1, Number(params.get('size') ?? DEFAULT_PAGE.size) || DEFAULT_PAGE.size)),
      sort: sortOk ? (sort as string) : DEFAULT_PAGE.sort,
    };
    return { filter, page, usingDefaults };
  }

  private isOnlySubmitted(f: ClaimFilter): boolean {
    return f.status.length === 1 && f.status[0] === 'SUBMITTED' && !f.market && !f.type && !f.submittedFrom && !f.submittedTo;
  }
}
