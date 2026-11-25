import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Retry button, with an error message when the page owns the error (05 §7.2). With no message it is Retry only. */
@Component({
  selector: 'app-error-panel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="panel" [attr.role]="message() ? 'alert' : null" data-testid="error-panel">
      @if (message()) {
        <mat-icon>error_outline</mat-icon>
        <span class="text" data-testid="error-text">{{ message() }}</span>
      }
      <button mat-stroked-button type="button" data-testid="retry" (click)="retry.emit()">Retry</button>
    </div>
  `,
  styles: `
    .panel { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); }
    .panel:has(.text) { border: 1px solid var(--status-rejected); border-radius: 4px; color: var(--status-rejected); background: #fdecea; }
    .text { flex: 1; }
  `,
})
export class ErrorPanelComponent {
  readonly message = input<string | null>(null);
  readonly retry = output<void>();
}
