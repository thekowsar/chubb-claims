import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { STATUS_COLOR } from '../../../../core/models/claim.model';
import { StaffWorkload } from '../../../../core/models/dashboard.model';
import { byTestId } from '../../../../testing/test-helpers';
import { WorkloadBarChartComponent } from './workload-bar-chart.component';

describe('WorkloadBarChartComponent (T25)', () => {
  let fixture: ComponentFixture<WorkloadBarChartComponent>;
  const WORKLOAD: StaffWorkload[] = [
    { staff: { id: 3, displayName: 'Chris Lim' }, assignedCount: 1, inProgressCount: 2 },
    { staff: { id: 4, displayName: 'Dana Ng' }, assignedCount: 0, inProgressCount: 1 },
    { staff: { id: 6, displayName: 'Faye Ho' }, assignedCount: 0, inProgressCount: 0 },
  ];

  function create(workload: StaffWorkload[]): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideCharts(withDefaultRegisterables())] });
    fixture = TestBed.createComponent(WorkloadBarChartComponent);
    fixture.componentRef.setInput('workload', workload);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('one label per staff member, including one with zero claims', () => {
    create(WORKLOAD);
    expect(fixture.componentInstance.chartData().labels).toEqual(['Chris Lim', 'Dana Ng', 'Faye Ho']);
  });

  it('two datasets (Assigned, In progress) with the right values and colours', () => {
    create(WORKLOAD);
    const [assigned, inProgress] = fixture.componentInstance.chartData().datasets;
    expect(assigned.label).toBe('Assigned');
    expect(assigned.data).toEqual([1, 0, 0]);
    expect(assigned.backgroundColor).toBe(STATUS_COLOR.ASSIGNED);
    expect(inProgress.label).toBe('In progress');
    expect(inProgress.data).toEqual([2, 1, 0]);
    expect(inProgress.backgroundColor).toBe(STATUS_COLOR.IN_PROGRESS);
  });

  it('is stacked with integer ticks', () => {
    create(WORKLOAD);
    const scales = fixture.componentInstance.options?.scales as Record<string, { stacked?: boolean; ticks?: { precision?: number } }>;
    expect(scales['x'].stacked).toBeTrue();
    expect(scales['y'].stacked).toBeTrue();
    expect(scales['y'].ticks?.precision).toBe(0);
  });

  it('renders a canvas and a table toggle', () => {
    const el = create(WORKLOAD);
    expect(el.querySelector('canvas')).not.toBeNull();
    byTestId<HTMLButtonElement>(el, 'bar-toggle')!.click();
    fixture.detectChanges();
    expect(byTestId(el, 'bar-table')!.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('an empty workload shows the empty text', () => {
    const el = create([]);
    expect(byTestId(el, 'bar-empty')).not.toBeNull();
    expect(el.querySelector('canvas')).toBeNull();
  });

  it('all zero hides the chart and says so', () => {
    const el = create([WORKLOAD[2]]);
    expect(byTestId(el, 'bar-zero')).not.toBeNull();
    expect(el.querySelector('canvas')).toBeNull();
  });
});
