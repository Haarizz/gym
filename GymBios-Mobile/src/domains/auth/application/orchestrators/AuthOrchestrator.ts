import type { Result } from '@/core/types';

import type { PendingRegistration } from '../../domain/entities/PendingRegistration';
import type { Session } from '../../domain/entities/Session';
import type { SocialAuthOutcome } from '../../domain/entities/SocialAuthOutcome';
import type { LoginDto } from '../dto/LoginDto';
import type { SelectAppRoleDto } from '../dto/LoginDto';
import { AuthenticateWithApple, type AuthenticateWithAppleDto } from '../useCases/AuthenticateWithApple';
import { AuthenticateWithGoogle } from '../useCases/AuthenticateWithGoogle';
import { CompleteSocialRegistration, type CompleteSocialRegistrationDto } from '../useCases/CompleteSocialRegistration';
import { LinkProvider, type LinkProviderDto } from '../useCases/LinkProvider';
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
    private readonly authenticateWithGoogle: AuthenticateWithGoogle,
    private readonly authenticateWithApple: AuthenticateWithApple,
    private readonly completeSocialRegistration: CompleteSocialRegistration,
    private readonly linkProvider: LinkProvider,
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

  signInWithGoogle(idToken: string): Promise<Result<SocialAuthOutcome, string>> {
    return this.authenticateWithGoogle.execute(idToken);
  }

  signInWithApple(input: AuthenticateWithAppleDto): Promise<Result<SocialAuthOutcome, string>> {
    return this.authenticateWithApple.execute(input);
  }

  completeSocialSignUp(input: CompleteSocialRegistrationDto): Promise<Result<Session, string>> {
    return this.completeSocialRegistration.execute(input);
  }

  linkSocialProvider(input: LinkProviderDto): Promise<Result<void, string>> {
    return this.linkProvider.execute(input);
  }
}
