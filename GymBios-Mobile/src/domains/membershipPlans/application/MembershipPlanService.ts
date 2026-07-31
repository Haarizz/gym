import type {
  MembershipPlanRequest,
  MembershipPlanRepository,
} from './MembershipPlanRepository';
import type { MembershipPlan } from '../domain/MembershipPlan';

export class MembershipPlanService {
  constructor(private readonly repository: MembershipPlanRepository) {}

  getPlans(status?: string): Promise<MembershipPlan[]> {
    return this.repository.getPlans(status);
  }

  getPlanById(id: number): Promise<MembershipPlan> {
    return this.repository.getPlanById(id);
  }

  createPlan(request: MembershipPlanRequest): Promise<MembershipPlan> {
    return this.repository.createPlan(request);
  }

  updatePlan(
    id: number,
    request: MembershipPlanRequest,
  ): Promise<MembershipPlan> {
    return this.repository.updatePlan(id, request);
  }

  deletePlan(id: number): Promise<void> {
    return this.repository.deletePlan(id);
  }

  duplicatePlan(id: number): Promise<MembershipPlan> {
    return this.repository.duplicatePlan(id);
  }
}