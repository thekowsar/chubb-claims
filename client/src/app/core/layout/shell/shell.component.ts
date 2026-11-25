import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { MenuService } from '../../menu/menu.service';

/** Top bar and side menu built from GET /api/menu (05 §2.2). Logout is a fixed client action. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-toolbar color="primary" class="top-bar">
      <button mat-icon-button type="button" aria-label="Toggle menu" (click)="drawer.toggle()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="brand">chubb-claims</span>
      <span class="spacer"></span>
      @if (auth.currentUser(); as user) {
        <span class="user" data-testid="current-user">{{ user.displayName }} ({{ user.role }})</span>
      }
      <button mat-icon-button type="button" aria-label="Log out" data-testid="logout" (click)="logout()">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <mat-sidenav-container class="container">
      <mat-sidenav #drawer [mode]="isSmall() ? 'over' : 'side'" [opened]="!isSmall()" class="sidenav">
        <mat-nav-list>
          @for (item of menu.menu(); track item.code) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              [attr.data-menu-code]="item.code"
              (click)="isSmall() && drawer.close()"
            >
              @if (item.icon) {
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              }
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          } @empty {
            <p class="empty" data-testid="menu-empty">No menu items for your role. Contact support.</p>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    .top-bar { position: sticky; top: 0; z-index: 2; }
    .brand { margin-left: var(--space-2); font-weight: 500; }
    .spacer { flex: 1; }
    .user { margin-right: var(--space-2); font-size: 14px; }
    .container { flex: 1; }
    .sidenav { width: 220px; }
    .content { padding: var(--space-4); }
    .active { background: rgba(0, 0, 0, 0.06); }
    .empty { padding: var(--space-3); color: #666; }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly menu = inject(MenuService);
  private readonly router = inject(Router);

  protected readonly isSmall = toSignal(
    inject(BreakpointObserver).observe('(max-width: 767px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
