import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';

describe('UserService (T11)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listStaff asks for role=CLAIMS_STAFF', () => {
    TestBed.inject(UserService).listStaff().subscribe();
    expect(http.expectOne('/api/users?role=CLAIMS_STAFF').request.method).toBe('GET');
  });
});
