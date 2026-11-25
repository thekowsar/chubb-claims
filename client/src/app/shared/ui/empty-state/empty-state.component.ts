import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Icon, text and an optional action button for empty lists and "not found". */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty" data-testid="empty-state">
      <mat-icon class="icon">{{ icon() }}</mat-icon>
      <p class="text" data-testid="empty-text">{{ message() }}</p>
      @if (actionLabel()) {
        <button mat-stroked-button color="primary" type="button" data-testid="empty-action" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .empty { display: flex; flex-direction: column; align-items: center; padding: var(--space-4); color: #666; text-align: center; }
    .icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.5; }
    .text { margin: var(--space-2) 0 var(--space-3); }
  `,
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly icon = input('inbox');
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
