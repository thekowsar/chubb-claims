import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Dashboard, DashboardPeriod } from '../../../core/models/dashboard.model';

/** GET /api/dashboard?period= (04 #16). MANAGER only. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(period: DashboardPeriod): Observable<Dashboard> {
    return this.http.get<Dashboard>('/api/dashboard', { params: new HttpParams().set('period', period) });
  }
}
