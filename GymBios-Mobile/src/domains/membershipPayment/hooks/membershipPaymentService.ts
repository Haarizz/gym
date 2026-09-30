import { MembershipPaymentService } from '../application/MembershipPaymentService';
import { apiMembershipPaymentRepository } from '../infrastructure/ApiMembershipPaymentRepository';

export const membershipPaymentService = new MembershipPaymentService(apiMembershipPaymentRepository);
