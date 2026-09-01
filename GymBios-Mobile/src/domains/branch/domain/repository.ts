import { Branch } from './models';

export interface IBranchRepository {
  getMyBranches(): Promise<Branch[]>;
  getAllBranches(): Promise<Branch[]>;
}
