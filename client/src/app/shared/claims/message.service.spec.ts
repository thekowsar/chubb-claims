import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from './message.service';

describe('MessageService (T11)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list GETs the claim messages', () => {
    TestBed.inject(MessageService).list(4).subscribe();
    expect(http.expectOne('/api/claims/4/messages').request.method).toBe('GET');
  });

  it('send POSTs { body }', () => {
    TestBed.inject(MessageService).send(4, 'Hello').subscribe();
    const req = http.expectOne('/api/claims/4/messages');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'Hello' });
  });
});
