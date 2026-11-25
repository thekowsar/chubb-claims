import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Centred spinner with an accessible label. */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading" role="status" [attr.aria-label]="label()" data-testid="loading">
      <mat-spinner diameter="36" />
      <span class="label">{{ label() }}</span>
    </div>
  `,
  styles: `
    .loading { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-4); color: #666; }
    .label { font-size: 13px; }
  `,
})
export class LoadingComponent {
  readonly label = input('Loading…');
}
