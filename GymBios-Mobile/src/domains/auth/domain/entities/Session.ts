import type { AppRole } from '../valueObjects/AppRole';
import type { User } from './User';

export interface SessionProps {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: User;
  readonly appRole: AppRole;
  readonly permissions: readonly string[];
  readonly expiresAt: Date;
}

export class Session {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: User;
  readonly appRole: AppRole;
  readonly permissions: readonly string[];
  readonly expiresAt: Date;

  private constructor(props: SessionProps) {
    this.accessToken = props.accessToken;
    this.refreshToken = props.refreshToken;
    this.user = props.user;
    this.appRole = props.appRole;
    this.permissions = props.permissions;
    this.expiresAt = props.expiresAt;
  }

  static create(props: SessionProps): Session {
    return new Session(props);
  }

  isExpired(referenceDate = new Date()): boolean {
    return this.expiresAt.getTime() <= referenceDate.getTime();
  }
}
