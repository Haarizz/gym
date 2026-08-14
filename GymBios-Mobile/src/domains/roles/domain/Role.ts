export interface Role {
  id: number;
  roleName: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissionKeys: string[];
}
