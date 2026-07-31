import type {
  MemberAccessRepository,
  SetCredentialsRequest,
} from './MemberAccessRepository';
import type { Member } from '../../domain/Member';

export class MemberAccessService {
  constructor(
    private readonly repository: MemberAccessRepository,
  ) {}

  setCredentials(
    id: number,
    request: SetCredentialsRequest,
  ): Promise<Member> {
    if (!request.appPassword || request.appPassword.trim().length === 0) {
      throw new Error('Password is required');
    }
    return this.repository.setCredentials(id, request);
  }

  toggleAccess(id: number, enabled: boolean): Promise<Member> {
    return this.repository.toggleAccess(id, enabled);
  }
}