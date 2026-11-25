import { TestBed } from '@angular/core/testing';
import { allByTestId, makeHistory } from '../../../testing/test-helpers';
import { StatusTimelineComponent } from './status-timeline.component';

describe('StatusTimelineComponent', () => {
  it('shows one item per history row, with the assignee on ASSIGNED', () => {
    const fixture = TestBed.createComponent(StatusTimelineComponent);
    fixture.componentRef.setInput('history', makeHistory());
    fixture.detectChanges();

    const items = allByTestId(fixture.nativeElement, 'timeline-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Submitted');
    expect(items[0].textContent).toContain('Ben Wong');
    expect(items[1].textContent).toContain('Assigned');
    expect(items[1].textContent).toContain('Evan Lee');
    expect(items[1].textContent).toContain('→ Chris Lim');
  });

  it('shows a note when there is no history', () => {
    const fixture = TestBed.createComponent(StatusTimelineComponent);
    fixture.componentRef.setInput('history', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No history yet.');
  });
});
