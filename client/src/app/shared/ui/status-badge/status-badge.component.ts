import { Component, computed, input } from '@angular/core';
import { ClaimStatus, STATUS_LABEL } from '../../../core/models/claim.model';

/** Coloured chip per ClaimStatus. Always shows a text label, not colour alone (05 §8). */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="'status-' + cssKey()" data-testid="status-badge">{{ label() }}</span>`,
  styles: `
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
      color: #fff; white-space: nowrap; line-height: 20px; }
    .status-submitted { background: var(--status-submitted); }
    .status-assigned { background: var(--status-assigned); }
    .status-in-progress { background: var(--status-in-progress); }
    .status-settled { background: var(--status-settled); }
    .status-rejected { background: var(--status-rejected); }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ClaimStatus>();
  readonly label = computed(() => STATUS_LABEL[this.status()] ?? this.status());
  readonly cssKey = computed(() => this.status().toLowerCase().replace(/_/g, '-'));
}
