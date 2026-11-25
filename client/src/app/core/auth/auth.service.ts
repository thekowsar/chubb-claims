import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { MenuService } from '../menu/menu.service';
import { LoginRequest, LoginResponse, RoleCode, User } from '../models/user.model';
import { TokenStorageService } from './token-storage.service';

/** Login, logout and session restore (05 §3.1, §5). Holds the current user in a signal. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly menuService = inject(MenuService);
  private readonly user = signal<User | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed<RoleCode | null>(() => this.user()?.role ?? null);

  token(): string | null {
    return this.storage.validToken();
  }

  /** Stores the token, sets the user, then loads the menu. Errors are passed to the caller. */
  login(request: LoginRequest): Observable<User> {
    return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
      tap((res) => {
        this.storage.save(res.token);
        this.user.set(res.user);
      }),
      switchMap((res) => this.menuService.load().pipe(map(() => res.user))),
    );
  }

  /** Client-side only (01 §4): forget the token, the user and the menu. */
  logout(): void {
    this.storage.clear();
    this.user.set(null);
    this.menuService.clear();
  }

  /**
   * On app start: with a valid stored token, load /me and the menu; otherwise do nothing.
   * Never errors, so it is safe in an app initializer.
   */
  restoreSession(): Observable<User | null> {
    if (!this.storage.get()) {
      return of(null);
    }
    if (!this.storage.hasValidToken()) {
      this.logout();
      return of(null);
    }
    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => this.user.set(user)),
      switchMap((user) => this.menuService.load().pipe(map(() => user))),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }
}
