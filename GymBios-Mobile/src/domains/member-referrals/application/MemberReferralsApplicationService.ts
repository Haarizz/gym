import { MemberReferralsRepository } from './MemberReferralsRepository';
import {
  MobileReferralProfile,
  ClaimReferralRequest,
  ClaimReferralResponse,
  MobileReferralAttribution,
  MyReferralClaim,
  MobileReferralStatus,
} from '../domain/types';

export class MemberReferralsApplicationService {
  constructor(private readonly repository: MemberReferralsRepository) {}

  async getMyProfile(): Promise<MobileReferralProfile> {
    return this.repository.getMyProfile();
  }

  async claimCode(code: string): Promise<ClaimReferralResponse> {
    return this.repository.claimCode({ code });
  }

  async getHistory(): Promise<MobileReferralAttribution[]> {
    return this.repository.getHistory();
  }

  async getMyClaim(): Promise<MyReferralClaim | null> {
    return this.repository.getMyClaim();
  }

  async retryMyClaim(): Promise<MobileReferralStatus> {
    return this.repository.retryMyClaim();
  }
}
