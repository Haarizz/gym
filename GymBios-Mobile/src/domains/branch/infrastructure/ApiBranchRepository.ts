import { apiClient } from '@/core/network/apiClient';
import { Branch } from '../domain/models';
import { IBranchRepository } from '../domain/repository';

export class ApiBranchRepository implements IBranchRepository {
  async getMyBranches(): Promise<Branch[]> {
    const { data } = await apiClient.get<Branch[]>('/branches/my-branches');
    return data;
  }

  async getAllBranches(): Promise<Branch[]> {
    const { data } = await apiClient.get<Branch[]>('/branches');
    return data;
  }
}
