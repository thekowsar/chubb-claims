import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Message } from '../../core/models/message.model';

/** Claim messages (04 #12, #13). Sending is allowed only while the claim is IN_PROGRESS. */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);

  list(claimId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`/api/claims/${claimId}/messages`);
  }

  send(claimId: number, body: string): Observable<Message> {
    return this.http.post<Message>(`/api/claims/${claimId}/messages`, { body });
  }
}
