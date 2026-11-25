import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../core/models/user.model';

/** User lookup for the assign dialog (04 #15). MANAGER only. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  listStaff(): Observable<User[]> {
    return this.http.get<User[]>('/api/users', { params: new HttpParams().set('role', 'CLAIMS_STAFF') });
  }
}
