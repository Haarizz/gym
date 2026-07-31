import type { Member } from '../../domain/Member';

export interface FreezeRequest {
  freezeStartDate: string;
  freezeEndDate: string;
  reason?: string;
}

export interface MemberFreezeRepository {
  freezeMember(id: number, request: FreezeRequest): Promise<Member>;

  unfreezeMember(id: number): Promise<Member>;
}