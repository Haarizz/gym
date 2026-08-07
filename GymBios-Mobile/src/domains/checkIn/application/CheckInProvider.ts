import type { CheckInRequest, CheckInResult } from '../domain';

export interface CheckInProvider {
  readonly name: string;
  checkIn(request: CheckInRequest): Promise<CheckInResult>;
}
