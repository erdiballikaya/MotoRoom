import { AppError } from '../../core/errors/app-error.js';
import { AuthenticatedUser } from '../../core/security/auth-context.js';
import { hashPassword, verifyPassword } from '../../core/security/passwords.js';
import {
  createAccessToken,
  createRefreshExpiry,
  createRefreshToken,
  hashRefreshToken
} from '../../core/security/tokens.js';
import { UserRepository } from '../users/user.repository.js';
import { toPublicUser, UserRecord } from '../users/user.types.js';
import { AuthRepository } from './auth.repository.js';

const toAuthenticatedUser = (user: UserRecord): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  membershipTier: user.membershipTier,
  role: user.role
});

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository
  ) {}

  async register(input: { email: string; password: string; displayName: string }, meta: { ip?: string; userAgent?: string }) {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser && !existingUser.deletedAt) {
      throw new AppError('EMAIL_ALREADY_EXISTS', 'A MotoRoom account already exists for this email.', 409);
    }

    const user = await this.userRepository.createEmailUser({
      email: input.email,
      displayName: input.displayName,
      passwordHash: await hashPassword(input.password)
    });

    return this.createSession(user, meta);
  }

  async login(input: { email: string; password: string }, meta: { ip?: string; userAgent?: string }) {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || user.deletedAt) {
      throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    return this.createSession(user, meta);
  }

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }) {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.authRepository.findRefreshToken(tokenHash);

    if (!storedToken || storedToken.revoked_at || storedToken.expires_at <= new Date()) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.', 401);
    }

    const user = await this.userRepository.findById(storedToken.user_id);

    if (!user || user.deletedAt) {
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh token user is unavailable.', 401);
    }

    await this.authRepository.revokeRefreshToken(tokenHash);
    return this.createSession(user, meta);
  }

  async logout(refreshToken: string) {
    await this.authRepository.revokeRefreshToken(hashRefreshToken(refreshToken));
  }

  private async createSession(user: UserRecord, meta: { ip?: string; userAgent?: string }) {
    const authenticatedUser = toAuthenticatedUser(user);
    const refreshToken = createRefreshToken();

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: createRefreshExpiry(),
      ip: meta.ip,
      userAgent: meta.userAgent
    });

    return {
      accessToken: await createAccessToken(authenticatedUser),
      refreshToken,
      user: toPublicUser(user)
    };
  }
}

