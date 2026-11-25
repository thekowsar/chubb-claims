import { Component, computed, input, signal } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { CLAIM_STATUSES, STATUS_COLOR, STATUS_LABEL } from '../../../../core/models/claim.model';
import { StatusCount } from '../../../../core/models/dashboard.model';

/** Pie of claims by status for the period (05 §2.7, F5). Fixed status order, badge colours, table toggle. */
@Component({
  selector: 'app-status-pie-chart',
  standalone: true,
  imports: [BaseChartDirective, MatButtonModule],
  template: `
    @if (allZero()) {
      <p class="empty" data-testid="pie-empty">No claims in this period.</p>
    } @else {
      @if (showTable()) {
        <table class="data" data-testid="pie-table">
          <thead><tr><th>Status</th><th class="num">Claims</th></tr></thead>
          <tbody>
            @for (row of rows(); track row.status) {
              <tr><td>{{ row.label }}</td><td class="num">{{ row.count }}</td></tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="chart">
          <canvas baseChart type="pie" [data]="chartData()" [options]="options" aria-label="Claims by status" role="img"></canvas>
        </div>
      }
      <button mat-button type="button" class="toggle" data-testid="pie-toggle" (click)="showTable.set(!showTable())">
        {{ showTable() ? 'Show as chart' : 'Show as table' }}
      </button>
    }
  `,
  styles: `
    .chart { position: relative; height: 240px; }
    .empty { color: #666; }
    .data { width: 100%; border-collapse: collapse; }
    .data th, .data td { padding: 4px 8px; border-bottom: 1px solid #eee; text-align: left; }
    .num { text-align: right !important; }
    .toggle { margin-top: var(--space-2); }
  `,
})
export class StatusPieChartComponent {
  readonly counts = input.required<StatusCount[]>();
  readonly showTable = signal(false);

  /** One row per status in the fixed order, 0 when the API leaves a status out. */
  readonly rows = computed(() =>
    CLAIM_STATUSES.map((status) => ({
      status,
      label: STATUS_LABEL[status],
      count: this.counts().find((c) => c.status === status)?.count ?? 0,
    })),
  );
  readonly allZero = computed(() => this.rows().every((r) => r.count === 0));

  readonly chartData = computed<ChartData<'pie', number[], string>>(() => ({
    labels: this.rows().map((r) => r.label),
    datasets: [
      {
        data: this.rows().map((r) => r.count),
        backgroundColor: CLAIM_STATUSES.map((s) => STATUS_COLOR[s]),
      },
    ],
  }));

  readonly options: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } },
  };
}
