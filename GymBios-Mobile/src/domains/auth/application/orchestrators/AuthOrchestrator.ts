import type { Result } from '@/core/types';

import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { Session } from '../../domain/entities/Session';
import type { LoginDto } from '../dto/LoginDto';
import type { SelectAppRoleDto } from '../dto/LoginDto';
import { LoginUser } from '../useCases/LoginUser';
import { LogoutUser } from '../useCases/LogoutUser';
import { RegisterUser, type RegisterUserDto } from '../useCases/RegisterUser';
import { ResendOtp } from '../useCases/ResendOtp';
import { SelectAppRole } from '../useCases/SelectAppRole';
import { VerifyOtp, type VerifyOtpDto } from '../useCases/VerifyOtp';

export class AuthOrchestrator {
  constructor(
    private readonly selectAppRole: SelectAppRole,
    private readonly loginUser: LoginUser,
    private readonly logoutUser: LogoutUser,
    private readonly registerUser: RegisterUser,
    private readonly verifyOtp: VerifyOtp,
    private readonly resendOtp: ResendOtp,
  ) {}

  chooseRole(input: SelectAppRoleDto): Promise<Result<void, string>> {
    return this.selectAppRole.execute(input);
  }

  signIn(input: LoginDto): Promise<Result<Session, string>> {
    return this.loginUser.execute(input);
  }

  register(input: RegisterUserDto): Promise<Result<PendingRegistration, string>> {
    return this.registerUser.execute(input);
  }

  confirmOtp(input: VerifyOtpDto): Promise<Result<Session, string>> {
    return this.verifyOtp.execute(input);
  }

  resendVerificationOtp(
    registrationToken: string,
  ): Promise<Result<Pick<PendingRegistration, 'otpExpiresAt' | 'resendAvailableAt' | 'devOtp'>, string>> {
    return this.resendOtp.execute(registrationToken);
  }

  signOut(): Promise<Result<void, string>> {
    return this.logoutUser.execute();
  }
}
