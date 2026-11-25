import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { MENUS, USERS } from '../../../testing/test-helpers';
import { AuthService } from '../../auth/auth.service';
import { MenuService } from '../../menu/menu.service';
import { MenuItem } from '../../models/menu.model';
import { User } from '../../models/user.model';
import { ShellComponent } from './shell.component';

describe('ShellComponent (T16)', () => {
  let fixture: ComponentFixture<ShellComponent>;
  const user = signal<User | null>(USERS.MANAGER);
  const items = signal<MenuItem[]>(MENUS.MANAGER);
  let logout: jasmine.Spy;
  let router: Router;

  beforeEach(async () => {
    user.set(USERS.MANAGER);
    items.set(MENUS.MANAGER);
    logout = jasmine.createSpy('logout');
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: user, logout } },
        { provide: MenuService, useValue: { menu: items } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  function links(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('a[data-menu-code]'));
  }

  it('renders one link per menu item in API order', () => {
    expect(links().map((a) => a.getAttribute('data-menu-code'))).toEqual(['DASHBOARD', 'ALL_CLAIMS']);
    expect(links().map((a) => a.querySelector('[matListItemTitle]')?.textContent?.trim())).toEqual([
      'Dashboard',
      'All claims',
    ]);
    expect(links().map((a) => a.querySelector('mat-icon')?.textContent?.trim())).toEqual(['dashboard', 'list']);
    expect(links().map((a) => a.getAttribute('href'))).toEqual(['/manager/dashboard', '/manager/claims']);
  });

  it('re-renders when the menu signal changes', () => {
    items.set(MENUS.CLAIMANT);
    fixture.detectChanges();
    expect(links().map((a) => a.getAttribute('data-menu-code'))).toEqual(['MY_CLAIMS', 'NEW_CLAIM']);
  });

  it('shows the display name and role', () => {
    const text = fixture.nativeElement.querySelector('[data-testid="current-user"]').textContent.trim();
    expect(text).toBe('Evan Lee (MANAGER)');
  });

  it('shows the empty text when the menu is empty', () => {
    items.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="menu-empty"]').textContent).toContain(
      'No menu items for your role',
    );
  });

  it('logout calls auth.logout and goes to /login', () => {
    fixture.nativeElement.querySelector('[data-testid="logout"]').click();
    expect(logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
