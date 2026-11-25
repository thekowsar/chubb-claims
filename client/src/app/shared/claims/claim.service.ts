import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssessClaimRequest,
  CreateClaimRequest,
  RejectClaimRequest,
  SettleClaimRequest,
} from '../../core/models/claim-requests.model';
import { ClaimDetail, ClaimFilter, ClaimSummary, Page, PageRequest } from '../../core/models/claim.model';
import { StatusHistory } from '../../core/models/history.model';

const BASE = '/api/claims';

/** Claim endpoints (04 #4 to #11 and #14). The envelope interceptor unwraps `data`, so these return the DTO. */
@Injectable({ providedIn: 'root' })
export class ClaimService {
  private readonly http = inject(HttpClient);

  /** Builds `?status=A&status=B&market=..&page=..` and leaves out empty filters. */
  search(filter: ClaimFilter, page: PageRequest): Observable<Page<ClaimSummary>> {
    let params = new HttpParams();
    for (const status of filter.status) {
      params = params.append('status', status);
    }
    if (filter.market) params = params.set('market', filter.market);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.submittedFrom) params = params.set('submittedFrom', filter.submittedFrom);
    if (filter.submittedTo) params = params.set('submittedTo', filter.submittedTo);
    params = params.set('page', page.page).set('size', page.size).set('sort', page.sort);
    return this.http.get<Page<ClaimSummary>>(BASE, { params });
  }

  get(id: number): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${BASE}/${id}`);
  }

  create(request: CreateClaimRequest): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(BASE, request);
  }

  assign(id: number, staffId: number): Observable<ClaimDetail> {
    return this.http.put<ClaimDetail>(`${BASE}/${id}/assignment`, { staffId });
  }

  start(id: number): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`${BASE}/${id}/start`, null);
  }

  assess(id: number, request: AssessClaimRequest): Observable<ClaimDetail> {
    return this.http.patch<ClaimDetail>(`${BASE}/${id}/assessment`, request);
  }

  settle(id: number, request: SettleClaimRequest): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`${BASE}/${id}/settle`, request);
  }

  reject(id: number, request: RejectClaimRequest): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`${BASE}/${id}/reject`, request);
  }

  history(id: number): Observable<StatusHistory[]> {
    return this.http.get<StatusHistory[]>(`${BASE}/${id}/history`);
  }
}
