import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { STATUS_COLOR } from '../../../../core/models/claim.model';
import { StatusCount } from '../../../../core/models/dashboard.model';
import { byTestId } from '../../../../testing/test-helpers';
import { StatusPieChartComponent } from './status-pie-chart.component';

describe('StatusPieChartComponent (T24)', () => {
  let fixture: ComponentFixture<StatusPieChartComponent>;

  function create(counts: StatusCount[]): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideCharts(withDefaultRegisterables())] });
    fixture = TestBed.createComponent(StatusPieChartComponent);
    fixture.componentRef.setInput('counts', counts);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('builds one label and value per status in a fixed order, filling gaps with 0', () => {
    create([
      { status: 'REJECTED', count: 1 },
      { status: 'SUBMITTED', count: 2 },
      { status: 'IN_PROGRESS', count: 3 },
    ]);
    const data = fixture.componentInstance.chartData();
    expect(data.labels).toEqual(['Submitted', 'Assigned', 'In progress', 'Settled', 'Rejected']);
    expect(data.datasets[0].data).toEqual([2, 0, 3, 0, 1]);
  });

  it('uses the status badge colours', () => {
    create([{ status: 'SETTLED', count: 1 }]);
    expect(fixture.componentInstance.chartData().datasets[0].backgroundColor).toEqual([
      STATUS_COLOR.SUBMITTED,
      STATUS_COLOR.ASSIGNED,
      STATUS_COLOR.IN_PROGRESS,
      STATUS_COLOR.SETTLED,
      STATUS_COLOR.REJECTED,
    ]);
  });

  it('renders a canvas when there is data', () => {
    const el = create([{ status: 'SUBMITTED', count: 2 }]);
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(byTestId(el, 'pie-empty')).toBeNull();
  });

  it('all zero shows the empty text and no canvas', () => {
    const el = create([{ status: 'SUBMITTED', count: 0 }]);
    expect(byTestId(el, 'pie-empty')?.textContent).toContain('No claims in this period');
    expect(el.querySelector('canvas')).toBeNull();
  });

  it('"Show as table" renders one row per status, and toggles back', () => {
    const el = create([{ status: 'ASSIGNED', count: 4 }]);
    byTestId<HTMLButtonElement>(el, 'pie-toggle')!.click();
    fixture.detectChanges();

    const rows = byTestId(el, 'pie-table')!.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
    expect(rows[1].textContent).toContain('Assigned');
    expect(rows[1].textContent).toContain('4');
    expect(el.querySelector('canvas')).toBeNull();

    byTestId<HTMLButtonElement>(el, 'pie-toggle')!.click();
    fixture.detectChanges();
    expect(el.querySelector('canvas')).not.toBeNull();
  });
});
