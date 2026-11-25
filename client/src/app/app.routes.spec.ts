import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { apiEnvelopeInterceptor } from './core/http/api-envelope.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { RoleCode } from './core/models/user.model';
import { NotifyService } from './core/notify/notify.service';
import { MENUS, USERS, envelope, errorEnvelope, makeToken } from './testing/test-helpers';

/** The real route table, guards, interceptors and services together (login -> menu -> home). */
describe('app routes', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor, apiEnvelopeInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // Page data requests (claim lists, dashboard) are covered by each page's own spec.
    http.match((r) => r.url === '/api/claims' || r.url.startsWith('/api/claims/') || r.url === '/api/dashboard');
    http.verify();
    sessionStorage.clear();
  });

  function loginAs(role: RoleCode): void {
    TestBed.inject(AuthService).login({ username: USERS[role].username, password: 'pw' }).subscribe();
    http.expectOne('/api/auth/login').flush(
      envelope({ token: makeToken(role), tokenType: 'Bearer', expiresIn: 3600, user: USERS[role] }),
    );
    const menuReq = http.expectOne('/api/menu');
    expect(menuReq.request.headers.get('Authorization')).toMatch(/^Bearer /);
    menuReq.flush(envelope(MENUS[role]));
  }

  it('creates the root component', () => {
    expect(TestBed.createComponent(AppComponent).componentInstance).toBeTruthy();
  });

  it('a guest opening / lands on /login', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/login');
  });

  it('a guest opening a role page is sent to /login with returnUrl', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/manager/dashboard');
    expect(router.url).toBe('/login?returnUrl=%2Fmanager%2Fdashboard');
  });

  const homes: [RoleCode, string, string][] = [
    ['CLAIMANT', '/claimant/claims', 'My claims'],
    ['CLAIMS_STAFF', '/staff/queue', 'My work queue'],
    ['MANAGER', '/manager/dashboard', 'Dashboard'],
  ];
  for (const [role, home, title] of homes) {
    it(`${role} opening / goes to the home page from the menu (${home})`, async () => {
      loginAs(role);
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/');

      expect(router.url).toBe(home);
      expect(harness.routeNativeElement?.textContent).toContain(title);
    });
  }

  it("a claimant opening the manager's page is sent to their own home", async () => {
    loginAs('CLAIMANT');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/manager/dashboard');

    expect(router.url).toBe('/claimant/claims');
  });

  it('a logged-in user opening /login is sent home', async () => {
    loginAs('CLAIMS_STAFF');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/staff/queue');
  });

  it('a logged-in user on an unknown route sees the not-found page with a home link', async () => {
    loginAs('MANAGER');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/does/not/exist');

    expect(router.url).toBe('/does/not/exist');
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
    const link = harness.routeNativeElement?.querySelector('[data-testid="home-link"]') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/manager/dashboard');
  });

  const detailRoutes: [RoleCode, string][] = [
    ['CLAIMANT', '/claimant/claims/4'],
    ['CLAIMS_STAFF', '/staff/claims/4'],
    ['MANAGER', '/manager/claims/4'],
  ];
  for (const [role, url] of detailRoutes) {
    it(`${role} opening ${url} loads claim 4 with its messages and history`, async () => {
      loginAs(role);
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(url);

      expect(router.url).toBe(url);
      http.expectOne('/api/claims/4');
      http.expectOne('/api/claims/4/messages');
      http.expectOne('/api/claims/4/history');
    });
  }

  it('staff opening a claim assigned to someone else sees exactly one access-denied message and goes home', async () => {
    loginAs('CLAIMS_STAFF');
    const notify = TestBed.inject(NotifyService);
    spyOn(notify, 'error');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/staff/claims/5');
    // The detail page asks for the claim, its messages and its history in parallel. All three are forbidden.
    const forbidden = errorEnvelope('ACCESS_DENIED', 'Claim 5 is not assigned to you');
    for (const url of ['/api/claims/5', '/api/claims/5/messages', '/api/claims/5/history']) {
      for (const req of http.match(url)) {
        if (!req.cancelled) {
          req.flush(forbidden, { status: 403, statusText: 'Forbidden' });
        }
      }
    }
    // The interceptor's redirect home is an ordinary router navigation; let it finish.
    for (let i = 0; i < 5 && router.url !== '/staff/queue'; i++) {
      await new Promise((resolve) => setTimeout(resolve));
      await harness.fixture.whenStable();
    }
    harness.detectChanges();
    http.match((r) => r.url === '/api/claims'); // the work queue's own list request

    expect(notify.error).toHaveBeenCalledOnceWith("You don't have access to that.");
    expect(router.url).toBe('/staff/queue');
    const page = harness.fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-testid="error-panel"]')).toBeNull();
  });

  /** Opens /staff/claims/5 and fails its parallel calls (claim, messages, history) the given way. */
  async function openFailingClaim(fail: (req: ReturnType<HttpTestingController['expectOne']>) => void) {
    loginAs('CLAIMS_STAFF');
    const notify = TestBed.inject(NotifyService);
    spyOn(notify, 'error');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/staff/claims/5');
    for (const url of ['/api/claims/5', '/api/claims/5/messages', '/api/claims/5/history']) {
      for (const req of http.match(url)) {
        if (!req.cancelled) {
          fail(req);
        }
      }
    }
    await harness.fixture.whenStable();
    harness.detectChanges();
    return { notify, page: harness.routeNativeElement as HTMLElement };
  }

  it('a 500 on a claim shows exactly one popup with the reference id, and the page shows Retry only', async () => {
    const { notify, page } = await openFailingClaim((req) =>
      req.flush(errorEnvelope('INTERNAL_ERROR', 'boom'), {
        status: 500,
        statusText: 'Server Error',
        headers: { 'X-Correlation-Id': 'corr-42' },
      }),
    );

    expect(notify.error).toHaveBeenCalledOnceWith('Something went wrong. Please try again. Reference: corr-42');
    expect(router.url).toBe('/staff/claims/5');
    expect(page.querySelector('[data-testid="retry"]')).not.toBeNull();
    expect(page.querySelector('[data-testid="error-text"]')).toBeNull();
  });

  it('a network error on a claim shows exactly one popup, and the page shows Retry only', async () => {
    const { notify, page } = await openFailingClaim((req) => req.error(new ProgressEvent('error'), { status: 0 }));

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect((notify.error as jasmine.Spy).calls.mostRecent().args[0]).toMatch(/^Something went wrong\. Please try again\. Reference: [0-9a-f-]{36}$/);
    expect(page.querySelector('[data-testid="retry"]')).not.toBeNull();
    expect(page.querySelector('[data-testid="error-text"]')).toBeNull();
  });

  it('a 404 on a claim shows no popup and one "Claim not found" message on the page', async () => {
    const { notify, page } = await openFailingClaim((req) =>
      req.flush(errorEnvelope('CLAIM_NOT_FOUND', 'Claim 5 not found'), { status: 404, statusText: 'Not Found' }),
    );

    expect(notify.error).not.toHaveBeenCalled();
    expect(page.querySelectorAll('[data-testid="empty-text"]').length).toBe(1);
    expect(page.querySelector('[data-testid="empty-text"]')?.textContent).toBe('Claim not found');
    expect(page.querySelector('[data-testid="error-panel"]')).toBeNull();
  });

  it('a burst of parallel server failures across the app shows exactly one popup', () => {
    loginAs('MANAGER');
    const notify = TestBed.inject(NotifyService);
    spyOn(notify, 'error');
    const client = TestBed.inject(HttpClient);
    const urls = ['/api/dashboard', '/api/claims', '/api/users'];
    for (const url of urls) {
      client.get(url).subscribe({ error: () => undefined });
    }
    http.expectOne('/api/dashboard').flush(errorEnvelope('INTERNAL_ERROR', 'x'), { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/claims').error(new ProgressEvent('error'), { status: 0 });
    http.expectOne('/api/users').flush('bad gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it('the claimant New claim route is not taken as a claim id', async () => {
    loginAs('CLAIMANT');
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/claimant/claims/new');

    expect(harness.routeNativeElement?.textContent).toContain('New claim');
    http.expectNone('/api/claims/new');
  });
});
