import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MenuService } from '../../core/menu/menu.service';

/** Screen 12: unknown route inside the app, with a link back to the role's home page. */
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <mat-icon class="icon">explore_off</mat-icon>
      <h1 data-testid="page-title">Page not found</h1>
      <p>The page you asked for doesn't exist.</p>
      <a mat-flat-button color="primary" [routerLink]="menu.homeRoute()" data-testid="home-link">Go to home page</a>
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; align-items: center; padding: var(--space-4); text-align: center; }
    .icon { font-size: 48px; width: 48px; height: 48px; color: #999; }
    h1 { font-weight: 400; }
  `,
})
export class NotFoundPage {
  protected readonly menu = inject(MenuService);
}
