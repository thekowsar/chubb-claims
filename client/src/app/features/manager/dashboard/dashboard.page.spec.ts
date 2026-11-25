import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { allByTestId, byTestId, envelope, errorEnvelope, makeDashboard, provideApiTesting } from '../../../testing/test-helpers';
import { DashboardPage } from './dashboard.page';
import { StatusPieChartComponent } from './status-pie-chart/status-pie-chart.component';
import { WorkloadBarChartComponent } from './workload-bar-chart/workload-bar-chart.component';

describe('DashboardPage (T23)', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideApiTesting(), provideNoopAnimations(), provideRouter([]), provideCharts(withDefaultRegisterables())],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const el = () => fixture.nativeElement as HTMLElement;

  function flush(data = makeDashboard(), period = 'ALL'): void {
    http.expectOne(`/api/dashboard?period=${period}`).flush(envelope(data));
    fixture.detectChanges();
  }

  it('defaults to ALL and shows the cards', () => {
    expect(byTestId(el(), 'dashboard-loading')).not.toBeNull();
    flush();
    expect(byTestId(el(), 'dashboard-loading')).toBeNull();
    expect(byTestId(el(), 'card-unassigned')?.textContent).toContain('2');
    expect(byTestId(el(), 'card-submitted')?.textContent).toContain('8');
    expect(byTestId(el(), 'card-settled')?.textContent).toContain('2');
    expect(byTestId(el(), 'card-rejected')?.textContent).toContain('1');
  });

  it('the Unassigned card links to All claims filtered by SUBMITTED', () => {
    flush();
    expect(byTestId<HTMLAnchorElement>(el(), 'card-unassigned')!.getAttribute('href')).toBe('/manager/claims?status=SUBMITTED');
  });

  it('switching to WEEK and MONTH refetches with the new period', () => {
    flush();
    fixture.componentInstance.period.set('WEEK');
    fixture.detectChanges();
    flush(makeDashboard({ period: 'WEEK', submittedCount: 3 }), 'WEEK');
    expect(byTestId(el(), 'card-submitted')?.textContent).toContain('3');

    const monthToggle = byTestId(el(), 'period-MONTH')!.querySelector('button') as HTMLButtonElement;
    monthToggle.click();
    fixture.detectChanges();
    flush(makeDashboard({ period: 'MONTH' }), 'MONTH');
  });

  it('passes countsByStatus to the pie and workload to the bar', () => {
    const data = makeDashboard();
    flush(data);
    const pie = fixture.debugElement.query((d) => d.componentInstance instanceof StatusPieChartComponent)
      .componentInstance as StatusPieChartComponent;
    const bar = fixture.debugElement.query((d) => d.componentInstance instanceof WorkloadBarChartComponent)
      .componentInstance as WorkloadBarChartComponent;
    expect(pie.counts()).toEqual(data.countsByStatus);
    expect(bar.workload()).toEqual(data.workload);
  });

  it('renders the liability and settled tables', () => {
    flush();
    const rows = allByTestId(el(), 'liability-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('SG');
    expect(rows[0].textContent).toContain('7,500.00');
    expect(rows[1].textContent).toContain('80,000.00');
    expect(allByTestId(el(), 'settled-row').map((r) => r.textContent?.trim())).toEqual(['THB 135,000.00', 'SGD 1,800.00']);
  });

  it('empty tables show their empty text', () => {
    flush(makeDashboard({ outstandingLiability: [], settledTotals: [] }));
    expect(byTestId(el(), 'liability-empty')?.textContent).toContain('No open claims');
    expect(byTestId(el(), 'settled-empty')?.textContent).toContain('No claims in this period');
  });

  it('an error shows Retry, which refetches', () => {
    http.expectOne('/api/dashboard?period=ALL').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'err' });
    fixture.detectChanges();
    expect(byTestId(el(), 'error-panel')).not.toBeNull();
    expect(byTestId(el(), 'error-text')).toBeNull(); // the interceptor popup is the one message

    byTestId<HTMLButtonElement>(el(), 'retry')!.click();
    flush();
    expect(byTestId(el(), 'error-panel')).toBeNull();
  });

  it('a network error shows Retry only, with no text of its own', () => {
    http.expectOne('/api/dashboard?period=ALL').error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(byTestId(el(), 'retry')).not.toBeNull();
    expect(byTestId(el(), 'error-text')).toBeNull();
  });

  it('a 403 shows no ErrorPanel (the error interceptor reports it)', () => {
    http.expectOne('/api/dashboard?period=ALL').flush(errorEnvelope('ACCESS_DENIED', 'no'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(byTestId(el(), 'error-panel')).toBeNull();
  });

  it('Refresh refetches the same period', () => {
    flush();
    byTestId<HTMLButtonElement>(el(), 'refresh')!.click();
    flush(makeDashboard({ unassignedCount: 5 }));
    expect(byTestId(el(), 'card-unassigned')?.textContent).toContain('5');
  });
});
