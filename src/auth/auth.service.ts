import {
    Injectable,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { User, UserStatus } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { ApiKey } from './entities/api-key.entity';
import { OAuthAccount } from './entities/oauth-account.entity';
import { Role } from '../roles/role.entity';
import { EmailService } from '../email/email.service';

import {
    RegisterDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
    Verify2FADto,
    Login2FADto,
    UpdateProfileDto,
    CreateApiKeyDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(RefreshToken) private refreshTokenRepo: Repository<RefreshToken>,
        @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
        @InjectRepository(ApiKey) private apiKeyRepo: Repository<ApiKey>,
        @InjectRepository(OAuthAccount) private oauthRepo: Repository<OAuthAccount>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
    ) { }

    // ─── HELPERS ─────────────────────────────────────────────────────────────────

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async audit(
        action: AuditAction,
        userId: string | null,
        ipAddress: string,
        userAgent: string,
        metadata?: Record<string, any>,
        success = true,
    ) {
        await this.auditRepo.save(
            this.auditRepo.create({ action, userId, ipAddress, userAgent, metadata, success }),
        );
    }

    private async generateTokenPair(
        user: User,
        ipAddress: string,
        userAgent: string,
    ) {
        const roles = (user.roles || []).map((r) => r.name);
        const permissions = (user.roles || []).flatMap((r) => r.permissions || []);

        const payload = { sub: user.id, email: user.email, roles, permissions };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('jwt.accessSecret'),
            expiresIn: this.configService.get('jwt.accessExpiry', '15m'),
        });

        const rawRefreshToken = uuidv4();
        const tokenHash = this.hashToken(rawRefreshToken);
        const expiryDays = 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        await this.refreshTokenRepo.save(
            this.refreshTokenRepo.create({
                tokenHash,
                userId: user.id,
                ipAddress,
                userAgent,
                expiresAt,
            }),
        );

        return { accessToken, refreshToken: rawRefreshToken };
    }

    // ─── REGISTER ────────────────────────────────────────────────────────────────

    async register(dto: RegisterDto, ipAddress: string, userAgent: string) {
        const existing = await this.userRepo.findOne({ where: { email: dto.email } });
        if (existing) {
            throw new ConflictException('Email is already registered');
        }

        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
        const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

        const verificationToken = uuidv4();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);

        const defaultRole = await this.roleRepo.findOne({ where: { isDefault: true } });

        const user = this.userRepo.create({
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
            status: UserStatus.PENDING,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: expiry,
            roles: defaultRole ? [defaultRole] : [],
        });

        await this.userRepo.save(user);

        await this.emailService.sendVerificationEmail(user.email, verificationToken, user.name ?? undefined);
        await this.audit(AuditAction.REGISTER, user.id, ipAddress, userAgent);

        return { message: 'Registration successful. Please check your email to verify your account.' };
    }

    // ─── VALIDATE USER (for local strategy) ──────────────────────────────────────

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepo.findOne({
            where: { email },
            relations: ['roles'],
        });

        if (!user || !user.password) return null;

        const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
        const lockMins = this.configService.get<number>('LOCK_TIME_MINUTES', 15);

        // Check if locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new UnauthorizedException(
                `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            const attempts = user.loginAttempts + 1;
            const updates: Partial<User> = { loginAttempts: attempts };

            if (attempts >= maxAttempts) {
                const lockedUntil = new Date();
                lockedUntil.setMinutes(lockedUntil.getMinutes() + lockMins);
                updates.lockedUntil = lockedUntil;
                updates.status = UserStatus.LOCKED;
                this.logger.warn(`User ${email} locked after ${attempts} failed attempts`);
            }

            await this.userRepo.update(user.id, updates);
            return null;
        }

        // Reset attempts on success
        if (user.loginAttempts > 0) {
            await this.userRepo.update(user.id, {
                loginAttempts: 0,
                lockedUntil: null,
                status: UserStatus.ACTIVE,
            });
        }

        return user;
    }

    // ─── LOGIN ────────────────────────────────────────────────────────────────────

    async login(user: User, ipAddress: string, userAgent: string) {
        if (user.status === UserStatus.SUSPENDED) {
            throw new UnauthorizedException('Account is suspended. Contact support.');
        }
        if (user.status === UserStatus.PENDING) {
            throw new UnauthorizedException('Please verify your email before logging in.');
        }

        // Load relations if not loaded
        if (!user.roles) {
            const fullUser = await this.userRepo.findOne({
                where: { id: user.id },
                relations: ['roles'],
            });
            user = fullUser!;
        }

        if (user.isTwoFactorEnabled) {
            // Return a pre-auth token (no full access)
            const preAuthToken = this.jwtService.sign(
                { sub: user.id, email: user.email, twoFactorPending: true },
                {
                    secret: this.configService.get('jwt.accessSecret'),
                    expiresIn: '5m',
                },
            );
            return { requiresTwoFactor: true, preAuthToken };
        }

        const { accessToken, refreshToken } = await this.generateTokenPair(user, ipAddress, userAgent);

        await this.userRepo.update(user.id, {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
        });
        await this.audit(AuditAction.LOGIN, user.id, ipAddress, userAgent);

        return { accessToken, refreshToken, user: this.sanitizeUser(user) };
    }

    // ─── LOGOUT ───────────────────────────────────────────────────────────────────

    async logout(userId: string, refreshToken: string, ipAddress: string, userAgent: string) {
        const tokenHash = this.hashToken(refreshToken);
        await this.refreshTokenRepo.update(
            { userId, tokenHash },
            { isRevoked: true, revokedAt: new Date() },
        );
        await this.audit(AuditAction.LOGOUT, userId, ipAddress, userAgent);
        return { message: 'Logged out successfully' };
    }

    // ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

    async validateRefreshToken(userId: string, rawToken: string) {
        const tokenHash = this.hashToken(rawToken);
        const record = await this.refreshTokenRepo.findOne({
            where: { userId, tokenHash, isRevoked: false },
        });

        if (!record || record.expiresAt < new Date()) {
            if (record) {
                // Token is expired but not revoked — clean up
                await this.refreshTokenRepo.update(record.id, { isRevoked: true, revokedAt: new Date() });
            }
            return null;
        }

        return record;
    }

    async refreshTokens(userId: string, oldRefreshToken: string, tokenId: string, ipAddress: string, userAgent: string) {
        // Revoke the old token (rotation)
        await this.refreshTokenRepo.update(
            { id: tokenId },
            { isRevoked: true, revokedAt: new Date() },
        );

        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['roles'],
        });

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User not found or inactive');
        }

        const tokens = await this.generateTokenPair(user, ipAddress, userAgent);
        await this.audit(AuditAction.REFRESH_TOKEN, userId, ipAddress, userAgent);

        return tokens;
    }

    // ─── EMAIL VERIFICATION ───────────────────────────────────────────────────────

    async verifyEmail(token: string) {
        const user = await this.userRepo.findOne({
            where: { emailVerificationToken: token },
        });

        if (!user) throw new BadRequestException('Invalid verification token');

        if (user.emailVerificationExpiry! < new Date()) {
            throw new BadRequestException('Verification token expired. Please request a new one.');
        }

        await this.userRepo.update(user.id, {
            isEmailVerified: true,
            status: UserStatus.ACTIVE,
            emailVerificationToken: null,
            emailVerificationExpiry: null,
        });

        await this.emailService.sendWelcomeEmail(user.email, user.name ?? undefined);
        await this.audit(AuditAction.EMAIL_VERIFICATION, user.id, '0.0.0.0', '');

        return { message: 'Email verified successfully. You can now log in.' };
    }

    async resendVerification(email: string) {
        const user = await this.userRepo.findOne({ where: { email } });

        if (!user || user.isEmailVerified) {
            // Don't leak whether email exists
            return { message: 'If your email exists and is unverified, a verification link has been sent.' };
        }

        const token = uuidv4();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);

        await this.userRepo.update(user.id, {
            emailVerificationToken: token,
            emailVerificationExpiry: expiry,
        });

        await this.emailService.sendVerificationEmail(email, token, user.name ?? undefined);
        return { message: 'If your email exists and is unverified, a verification link has been sent.' };
    }

    // ─── PASSWORD RESET ──────────────────────────────────────────────────────────

    async forgotPassword(dto: ForgotPasswordDto, ipAddress: string) {
        const user = await this.userRepo.findOne({ where: { email: dto.email } });

        if (!user) {
            return { message: 'If your email is registered, you will receive a reset link.' };
        }

        const token = uuidv4();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1); // 1 hour expiry

        await this.userRepo.update(user.id, {
            passwordResetToken: token,
            passwordResetExpiry: expiry,
        });

        await this.emailService.sendPasswordResetEmail(user.email, token, user.name ?? undefined);
        await this.audit(AuditAction.PASSWORD_RESET_REQUEST, user.id, ipAddress, '');

        return { message: 'If your email is registered, you will receive a reset link.' };
    }

    async resetPassword(dto: ResetPasswordDto, ipAddress: string) {
        const user = await this.userRepo.findOne({
            where: { passwordResetToken: dto.token },
        });

        if (!user) throw new BadRequestException('Invalid or expired reset token');
        if (user.passwordResetExpiry! < new Date()) {
            throw new BadRequestException('Reset token has expired');
        }

        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
        const hashedPassword = await bcrypt.hash(dto.newPassword, saltRounds);

        await this.userRepo.update(user.id, {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null,
        });

        // Revoke all sessions for security
        await this.refreshTokenRepo.update(
            { userId: user.id, isRevoked: false },
            { isRevoked: true, revokedAt: new Date() },
        );

        await this.audit(AuditAction.PASSWORD_RESET, user.id, ipAddress, '');
        await this.emailService.sendSecurityAlert(
            user.email,
            'Your password was recently reset. If this was not you, contact support immediately.',
        );

        return { message: 'Password reset successful. Please log in with your new password.' };
    }

    async changePassword(
        userId: string,
        dto: ChangePasswordDto,
        ipAddress: string,
        userAgent: string,
    ) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(dto.currentPassword, user.password!);
        if (!isMatch) throw new BadRequestException('Current password is incorrect');

        const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
        const newHash = await bcrypt.hash(dto.newPassword, saltRounds);

        await this.userRepo.update(userId, { password: newHash });
        await this.audit(AuditAction.PASSWORD_CHANGE, userId, ipAddress, userAgent);
        await this.emailService.sendSecurityAlert(
            user.email,
            'Your account password was changed. If this was not you, contact support immediately.',
        );

        return { message: 'Password changed successfully' };
    }

    // ─── 2FA / TOTP ──────────────────────────────────────────────────────────────

    async enable2FA(userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');
        if (user.isTwoFactorEnabled) {
            throw new BadRequestException('Two-factor authentication is already enabled');
        }

        const appName = this.configService.get('TOTP_APP_NAME', 'AuthService');
        const secret = speakeasy.generateSecret({
            name: `${appName}:${user.email}`,
            length: 20,
        });

        await this.userRepo.update(userId, { twoFactorSecret: secret.base32 });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            message: 'Scan the QR code with your authenticator app, then verify with a TOTP code to complete setup.',
        };
    }

    async verify2FA(userId: string, dto: Verify2FADto, ipAddress: string, userAgent: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('2FA setup not started');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: dto.code,
            window: 1,
        });

        if (!isValid) throw new BadRequestException('Invalid TOTP code');

        // Generate backup codes
        const backupCodes = Array.from({ length: 8 }, () =>
            uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase(),
        );
        const hashedBackupCodes = await Promise.all(
            backupCodes.map((c) => bcrypt.hash(c, 10)),
        );

        await this.userRepo.update(userId, {
            isTwoFactorEnabled: true,
            twoFactorBackupCodes: hashedBackupCodes,
        });

        await this.audit(AuditAction.TWO_FACTOR_ENABLED, userId, ipAddress, userAgent);
        await this.emailService.sendSecurityAlert(
            user.email,
            'Two-factor authentication has been enabled on your account.',
        );

        return {
            message: '2FA enabled successfully. Save these backup codes securely.',
            backupCodes,
        };
    }

    async disable2FA(userId: string, dto: Verify2FADto, ipAddress: string, userAgent: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !user.isTwoFactorEnabled) {
            throw new BadRequestException('2FA is not enabled');
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret!,
            encoding: 'base32',
            token: dto.code,
            window: 1,
        });

        if (!isValid) throw new BadRequestException('Invalid TOTP code');

        await this.userRepo.update(userId, {
            isTwoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
        });

        await this.audit(AuditAction.TWO_FACTOR_DISABLED, userId, ipAddress, userAgent);
        await this.emailService.sendSecurityAlert(
            user.email,
            'Two-factor authentication has been disabled on your account.',
        );

        return { message: '2FA disabled successfully' };
    }

    async loginWith2FA(dto: Login2FADto, ipAddress: string, userAgent: string) {
        const user = await this.validateUser(dto.email, dto.password);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        if (!user.isTwoFactorEnabled) {
            throw new BadRequestException('2FA is not enabled for this account');
        }

        // Check TOTP code
        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret!,
            encoding: 'base32',
            token: dto.totpCode,
            window: 1,
        });

        // Try backup code if TOTP fails
        if (!isValid) {
            const backupMatch = await this.validateBackupCode(user, dto.totpCode);
            if (!backupMatch) {
                throw new UnauthorizedException('Invalid TOTP or backup code');
            }
        }

        const fullUser = await this.userRepo.findOne({
            where: { id: user.id },
            relations: ['roles'],
        });

        const tokens = await this.generateTokenPair(fullUser!, ipAddress, userAgent);

        await this.userRepo.update(user.id, {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
        });
        await this.audit(AuditAction.TWO_FACTOR_LOGIN, user.id, ipAddress, userAgent);

        return { ...tokens, user: this.sanitizeUser(fullUser!) };
    }

    private async validateBackupCode(user: User, code: string): Promise<boolean> {
        if (!user.twoFactorBackupCodes?.length) return false;

        for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
            const isMatch = await bcrypt.compare(code.toUpperCase(), user.twoFactorBackupCodes[i]);
            if (isMatch) {
                // Remove used backup code
                const newCodes = [...user.twoFactorBackupCodes];
                newCodes.splice(i, 1);
                await this.userRepo.update(user.id, { twoFactorBackupCodes: newCodes });
                return true;
            }
        }
        return false;
    }

    // ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

    async googleLogin(profile: any, ipAddress: string, userAgent: string) {
        const { email, name, avatar, provider, providerAccountId, accessToken, refreshToken } = profile;

        let user = await this.userRepo.findOne({
            where: { email },
            relations: ['roles', 'oauthAccounts'],
        });

        if (!user) {
            const defaultRole = await this.roleRepo.findOne({ where: { isDefault: true } });
            user = this.userRepo.create({
                email,
                name,
                avatar,
                status: UserStatus.ACTIVE,
                isEmailVerified: true,
                roles: defaultRole ? [defaultRole] : [],
            });
            await this.userRepo.save(user);
        } else if (user.status === UserStatus.SUSPENDED) {
            throw new UnauthorizedException('Account is suspended');
        }

        // Upsert OAuth account
        let oauthAccount = await this.oauthRepo.findOne({
            where: { provider, providerAccountId },
        });

        if (!oauthAccount) {
            oauthAccount = this.oauthRepo.create({
                userId: user.id,
                provider,
                providerAccountId,
                accessToken,
                refreshToken,
                profile: { name, avatar },
            });
            await this.oauthRepo.save(oauthAccount);
        } else {
            await this.oauthRepo.update(oauthAccount.id, { accessToken, refreshToken });
        }

        const tokens = await this.generateTokenPair(user, ipAddress, userAgent);
        await this.userRepo.update(user.id, {
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
        });
        await this.audit(AuditAction.OAUTH_LOGIN, user.id, ipAddress, userAgent, { provider });

        return { ...tokens, user: this.sanitizeUser(user) };
    }

    // ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

    async getActiveSessions(userId: string) {
        return this.refreshTokenRepo.find({
            where: { userId, isRevoked: false },
            order: { createdAt: 'DESC' },
            select: ['id', 'ipAddress', 'userAgent', 'createdAt', 'expiresAt'],
        });
    }

    async revokeSession(userId: string, sessionId: string, ipAddress: string, userAgent: string) {
        const token = await this.refreshTokenRepo.findOne({
            where: { id: sessionId, userId },
        });
        if (!token) throw new NotFoundException('Session not found');

        await this.refreshTokenRepo.update(sessionId, {
            isRevoked: true,
            revokedAt: new Date(),
        });
        await this.audit(AuditAction.SESSION_REVOKED, userId, ipAddress, userAgent, { sessionId });

        return { message: 'Session revoked successfully' };
    }

    async revokeAllSessions(userId: string, currentTokenId: string, ipAddress: string, userAgent: string) {
        await this.refreshTokenRepo.update(
            { userId, isRevoked: false },
            { isRevoked: true, revokedAt: new Date() },
        );
        await this.audit(AuditAction.ALL_SESSIONS_REVOKED, userId, ipAddress, userAgent);

        return { message: 'All sessions have been revoked' };
    }

    // ─── PROFILE ─────────────────────────────────────────────────────────────────

    async getProfile(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ['roles'],
        });
        if (!user) throw new NotFoundException('User not found');
        return this.sanitizeUser(user);
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        await this.userRepo.update(userId, dto);
        return this.getProfile(userId);
    }

    // ─── API KEYS ─────────────────────────────────────────────────────────────────

    async createApiKey(userId: string, dto: CreateApiKeyDto, ipAddress: string, userAgent: string) {
        const rawKey = `sk-${uuidv4().replace(/-/g, '')}`;
        const keyHash = await bcrypt.hash(rawKey, 10);
        const keyPrefix = rawKey.substring(0, 10) + '...';

        const apiKey = this.apiKeyRepo.create({
            userId,
            name: dto.name,
            keyHash,
            keyPrefix,
            scopes: dto.scopes || [],
        });

        await this.apiKeyRepo.save(apiKey);
        await this.audit(AuditAction.API_KEY_CREATED, userId, ipAddress, userAgent, { name: dto.name });

        return {
            id: apiKey.id,
            name: apiKey.name,
            key: rawKey, // Only shown once!
            prefix: keyPrefix,
            scopes: apiKey.scopes,
            createdAt: apiKey.createdAt,
            warning: 'Store this key securely. It will not be shown again.',
        };
    }

    async getUserApiKeys(userId: string) {
        return this.apiKeyRepo.find({
            where: { userId, isActive: true },
            select: ['id', 'name', 'keyPrefix', 'scopes', 'lastUsedAt', 'createdAt', 'expiresAt'],
        });
    }

    async revokeApiKey(userId: string, keyId: string, ipAddress: string, userAgent: string) {
        const key = await this.apiKeyRepo.findOne({ where: { id: keyId, userId } });
        if (!key) throw new NotFoundException('API key not found');

        await this.apiKeyRepo.update(keyId, { isActive: false });
        await this.audit(AuditAction.API_KEY_REVOKED, userId, ipAddress, userAgent, { keyId });

        return { message: 'API key revoked successfully' };
    }

    // ─── TOKEN INTROSPECTION (OIDC compatible) ────────────────────────────────────

    async introspect(token: string) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('jwt.accessSecret'),
            });
            const user = await this.usersService.findOneById(payload.sub);

            if (!user || user.status !== UserStatus.ACTIVE) {
                return { active: false };
            }

            return {
                active: true,
                sub: payload.sub,
                email: payload.email,
                roles: payload.roles,
                exp: payload.exp,
                iat: payload.iat,
            };
        } catch {
            return { active: false };
        }
    }

    // ─── PRIVATE UTILS ────────────────────────────────────────────────────────────

    private sanitizeUser(user: User) {
        const { password, twoFactorSecret, twoFactorBackupCodes, emailVerificationToken, passwordResetToken, ...rest } = user as any;
        return rest;
    }
}
