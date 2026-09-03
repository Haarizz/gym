import type { AppRole } from '../valueObjects/AppRole';

export interface UserProps {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly appRole: AppRole;
  readonly permissions: readonly string[];
  readonly branchId?: number;
}

export class User {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly appRole: AppRole;
  readonly permissions: readonly string[];
  readonly branchId?: number;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.fullName = props.fullName;
    this.appRole = props.appRole;
    this.permissions = props.permissions;
    this.branchId = props.branchId;
  }

  static create(props: UserProps): User {
    return new User(props);
  }
}
