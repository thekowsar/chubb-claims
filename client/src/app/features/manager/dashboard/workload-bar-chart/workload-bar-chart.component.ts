import { Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { STATUS_COLOR } from '../../../../core/models/claim.model';
import { StaffWorkload } from '../../../../core/models/dashboard.model';

/** Stacked bar of current workload per staff member: Assigned + In progress (05 §2.7, F5). */
@Component({
  selector: 'app-workload-bar-chart',
  standalone: true,
  imports: [BaseChartDirective, MatButtonModule],
  template: `
    @if (workload().length === 0) {
      <p class="empty" data-testid="bar-empty">No claims staff found.</p>
    } @else if (allZero()) {
      <p class="empty" data-testid="bar-zero">No claims are assigned or in progress right now.</p>
    } @else {
      @if (showTable()) {
        <table class="data" data-testid="bar-table">
          <thead><tr><th>Staff</th><th class="num">Assigned</th><th class="num">In progress</th></tr></thead>
          <tbody>
            @for (w of workload(); track w.staff.id) {
              <tr>
                <td>{{ w.staff.displayName }}</td>
                <td class="num">{{ w.assignedCount }}</td>
                <td class="num">{{ w.inProgressCount }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="chart">
          <canvas baseChart type="bar" [data]="chartData()" [options]="options" aria-label="Workload per staff member" role="img"></canvas>
        </div>
      }
      <button mat-button type="button" class="toggle" data-testid="bar-toggle" (click)="showTable.set(!showTable())">
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
export class WorkloadBarChartComponent {
  readonly workload = input.required<StaffWorkload[]>();
  readonly showTable = signal(false);
  readonly allZero = computed(() => this.workload().every((w) => w.assignedCount === 0 && w.inProgressCount === 0));

  readonly chartData = computed<ChartData<'bar', number[], string>>(() => ({
    labels: this.workload().map((w) => w.staff.displayName),
    datasets: [
      { label: 'Assigned', data: this.workload().map((w) => w.assignedCount), backgroundColor: STATUS_COLOR.ASSIGNED },
      { label: 'In progress', data: this.workload().map((w) => w.inProgressCount), backgroundColor: STATUS_COLOR.IN_PROGRESS },
    ],
  }));

  readonly options: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
    plugins: { legend: { position: 'bottom' } },
  };
}
