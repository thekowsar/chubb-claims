import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { StatusHistory } from '../../../core/models/history.model';
import { StatusBadgeComponent } from '../../ui/status-badge/status-badge.component';

/** Status history timeline, oldest first (05 §2.5). */
@Component({
  selector: 'app-status-timeline',
  standalone: true,
  imports: [DatePipe, StatusBadgeComponent],
  template: `
    <ol class="timeline" data-testid="timeline">
      @for (h of history(); track $index) {
        <li class="item" data-testid="timeline-item">
          <app-status-badge [status]="h.toStatus" />
          <span class="when">{{ h.changedAt | date: 'd MMM y, HH:mm' }}</span>
          <span class="who">
            {{ h.changedBy.displayName }}
            @if (h.assignedStaff && (h.toStatus === 'ASSIGNED')) {
              → {{ h.assignedStaff.displayName }}
            }
          </span>
        </li>
      } @empty {
        <li class="none">No history yet.</li>
      }
    </ol>
  `,
  styles: `
    .timeline { list-style: none; margin: 0; padding: 0; border-left: 2px solid #ddd; }
    .item { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-2) 0 var(--space-2) var(--space-3); position: relative; }
    .item::before { content: ''; position: absolute; left: -6px; width: 10px; height: 10px; border-radius: 50%; background: #9e9e9e; }
    .when { color: #666; font-size: 13px; }
    .who { font-size: 14px; }
    .none { padding-left: var(--space-3); color: #666; }
  `,
})
export class StatusTimelineComponent {
  readonly history = input.required<StatusHistory[]>();
}
