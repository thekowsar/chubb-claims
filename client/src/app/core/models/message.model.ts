import { RoleCode, UserRef } from './user.model';

/** MessageDto and SendMessageRequest (04-api-spec.yaml). */
export interface Message {
  id: number;
  author: UserRef;
  authorRole: RoleCode;
  body: string;
  createdAt: string;
}

export interface SendMessageRequest {
  body: string;
}
