import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/http/app-error';
import { MenuService } from '../../../core/menu/menu.service';
import { User } from '../../../core/models/user.model';
import { USERS } from '../../../testing/test-helpers';
import { LoginComponent } from './login.component';

describe('LoginComponent (T15)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let queryParams: Record<string, string>;

  function el<T extends HTMLElement>(testId: string): T {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as T;
  }

  function type(testId: string, value: string): void {
    const input = el<HTMLInputElement>(testId);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function setUp(params: Record<string, string> = {}): Promise<void> {
    queryParams = params;
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MenuService, useValue: { homeRoute: () => '/claimant/claims' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  it('disables the button while the form is invalid', async () => {
    await setUp();
    expect(el<HTMLButtonElement>('submit').disabled).toBeTrue();

    type('username', 'claimant1');
    fixture.detectChanges();
    expect(el<HTMLButtonElement>('submit').disabled).toBeTrue();

    type('password', 'pw');
    fixture.detectChanges();
    expect(el<HTMLButtonElement>('submit').disabled).toBeFalse();
  });

  it('submit calls AuthService.login with the form values', async () => {
    await setUp();
    auth.login.and.returnValue(of(USERS.CLAIMANT));
    type('username', 'claimant1');
    type('password', 'pw');
    fixture.detectChanges();

    el<HTMLButtonElement>('submit').click();

    expect(auth.login).toHaveBeenCalledOnceWith({ username: 'claimant1', password: 'pw' });
  });

  it('shows a spinner and disables the button while the request runs', async () => {
    await setUp();
    const pending = new Subject<User>();
    auth.login.and.returnValue(pending.asObservable());
    type('username', 'claimant1');
    type('password', 'pw');
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-spinner')).not.toBeNull();
    expect(el<HTMLButtonElement>('submit').disabled).toBeTrue();
  });

  it('success navigates to the home page', async () => {
    await setUp();
    auth.login.and.returnValue(of(USERS.CLAIMANT));
    type('username', 'claimant1');
    type('password', 'pw');

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/claimant/claims');
  });

  it('success goes to returnUrl when it belongs to the user role', async () => {
    await setUp({ returnUrl: '/claimant/claims/new' });
    auth.login.and.returnValue(of(USERS.CLAIMANT));
    type('username', 'claimant1');
    type('password', 'pw');

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/claimant/claims/new');
  });

  it('ignores a returnUrl for another role', async () => {
    await setUp({ returnUrl: '/manager/dashboard' });
    auth.login.and.returnValue(of(USERS.CLAIMANT));
    type('username', 'claimant1');
    type('password', 'pw');

    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/claimant/claims');
  });

  it('401 INVALID_CREDENTIALS shows the inline error and clears the password', async () => {
    await setUp();
    auth.login.and.returnValue(
      throwError(() => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password')),
    );
    type('username', 'claimant1');
    type('password', 'wrong');

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(el('login-error').textContent?.trim()).toBe('Invalid username or password');
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(fixture.componentInstance.form.controls.username.value).toBe('claimant1');
    expect(fixture.componentInstance.form.enabled).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  for (const [status, code] of [[0, 'NETWORK_ERROR'], [500, 'INTERNAL_ERROR']] as const) {
    it(`status ${status} shows no inline text (the interceptor popup is the one message) and keeps the password`, async () => {
      await setUp();
      auth.login.and.returnValue(throwError(() => new AppError(status, code, 'x')));
      type('username', 'claimant1');
      type('password', 'pw');

      fixture.componentInstance.submit();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="login-error"]')).toBeNull();
      expect(fixture.componentInstance.form.controls.password.value).toBe('pw');
      expect(fixture.componentInstance.form.enabled).toBeTrue();
    });
  }

  it('other errors (e.g. 400) show a generic message and keep the password', async () => {
    await setUp();
    auth.login.and.returnValue(throwError(() => new AppError(400, 'VALIDATION_FAILED', 'bad')));
    type('username', 'claimant1');
    type('password', 'pw');

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(el('login-error').textContent?.trim()).toBe('Login failed. Please try again.');
    expect(fixture.componentInstance.form.controls.password.value).toBe('pw');
  });

  it('shows required errors after touching and does not call login when invalid', async () => {
    await setUp();
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    const errors = Array.from(fixture.nativeElement.querySelectorAll('mat-error')).map((e) =>
      (e as HTMLElement).textContent?.trim(),
    );
    expect(errors).toEqual(['Username is required', 'Password is required']);
  });
});
