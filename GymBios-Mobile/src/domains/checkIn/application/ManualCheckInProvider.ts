import type { CheckInProvider } from './CheckInProvider';
import type { CheckInRepository } from './CheckInRepository';
import type { CheckInRequest, CheckInResult } from '../domain';

export class ManualCheckInProvider implements CheckInProvider {
  readonly name = 'manual';

  constructor(private readonly repository: CheckInRepository) {}

  async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    return this.repository.checkIn(request);
  }
}
