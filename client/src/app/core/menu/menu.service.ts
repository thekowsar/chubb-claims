import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { MenuItem } from '../models/menu.model';

/** The caller's role menu from GET /api/menu (FR-25). Nothing about which role sees what is hard-coded here. */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly items = signal<MenuItem[]>([]);

  readonly menu = this.items.asReadonly();
  /** Home page is the first item (lowest sortOrder), or /login when there is no menu. */
  readonly homeRoute = computed(() => this.items()[0]?.route ?? '/login');

  load(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>('/api/menu').pipe(tap((items) => this.items.set(items ?? [])));
  }

  clear(): void {
    this.items.set([]);
  }
}
