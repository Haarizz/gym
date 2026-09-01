export interface Branch {
  id: number;
  branch_name: string;
  branch_code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  is_default?: boolean;
}
