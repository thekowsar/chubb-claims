import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuService } from '../../core/menu/menu.service';
import { NotFoundPage } from './not-found.page';

describe('NotFoundPage (T26)', () => {
  it('links to homeRoute()', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MenuService, useValue: { homeRoute: () => '/staff/queue' } }],
    });
    const fixture = TestBed.createComponent(NotFoundPage);
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('[data-testid="home-link"]');
    expect(fixture.nativeElement.textContent).toContain('Page not found');
    expect(link.getAttribute('href')).toBe('/staff/queue');
  });
});
