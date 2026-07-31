import type { Member } from '../../domain/Member';

export interface SetCredentialsRequest {
  appUsername: string;
  appPassword: string;
}

export interface MemberAccessRepository {
  setCredentials(
    id: number,
    request: SetCredentialsRequest,
  ): Promise<Member>;

  toggleAccess(id: number, enabled: boolean): Promise<Member>;
}