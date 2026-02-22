import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
    JwtRefreshGuard,
    LocalAuthGuard,
    GoogleOAuthGuard,
} from './guards/auth.guards';

import {
    RegisterDto,
    LoginDto,
    RefreshTokenDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto,
    Verify2FADto,
    Login2FADto,
    UpdateProfileDto,
    CreateApiKeyDto,
    ResendVerificationDto,
    IntrospectTokenDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller()
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private authService: AuthService) { }

    private getClientIp(req: Request): string {
        return (
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            '0.0.0.0'
        );
    }

    // ─── HEALTH ──────────────────────────────────────────────────────────────────

    @Get('health')
    @Public()
    @ApiOperation({ summary: 'Health check' })
    health() {
        return { status: 'ok', timestamp: new Date().toISOString(), service: 'auth-service' };
    }

    // ─── REGISTER ────────────────────────────────────────────────────────────────

    @Post('auth/register')
    @Public()
    @Throttle({ default: { ttl: 60000, limit: 5 } })
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'Registration successful' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    register(@Body() dto: RegisterDto, @Req() req: Request) {
        return this.authService.register(dto, this.getClientIp(req), req.headers['user-agent'] || '');
    }

    // ─── LOGIN ────────────────────────────────────────────────────────────────────

    @Post('auth/login')
    @Public()
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: 'Login with email and password' })
    login(@Req() req: Request & { user: any }) {
        return this.authService.login(req.user, this.getClientIp(req), req.headers['user-agent'] || '');
    }

    // ─── LOGOUT ───────────────────────────────────────────────────────────────────

    @Post('auth/logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout and revoke refresh token' })
    logout(
        @CurrentUser() user: any,
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
    ) {
        return this.authService.logout(
            user.id,
            dto.refreshToken,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── REFRESH ───────────────────────────────────────────────────────────────────

    @Post('auth/refresh')
    @Public()
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get new access token using refresh token' })
    refreshTokens(@Req() req: Request & { user: any }) {
        return this.authService.refreshTokens(
            req.user.id,
            req.user.refreshToken,
            req.user.tokenId,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── EMAIL VERIFICATION ───────────────────────────────────────────────────────

    @Get('auth/verify-email')
    @Public()
    @ApiOperation({ summary: 'Verify email address with token' })
    verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Post('auth/resend-verification')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @ApiOperation({ summary: 'Resend email verification link' })
    resendVerification(@Body() dto: ResendVerificationDto) {
        return this.authService.resendVerification(dto.email);
    }

    // ─── PASSWORD ─────────────────────────────────────────────────────────────────

    @Post('auth/forgot-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 3 } })
    @ApiOperation({ summary: 'Request a password reset email' })
    forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
        return this.authService.forgotPassword(dto, this.getClientIp(req));
    }

    @Post('auth/reset-password')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with token from email' })
    resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
        return this.authService.resetPassword(dto, this.getClientIp(req));
    }

    @Post('auth/change-password')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password (authenticated)' })
    changePassword(
        @CurrentUser() user: any,
        @Body() dto: ChangePasswordDto,
        @Req() req: Request,
    ) {
        return this.authService.changePassword(
            user.id,
            dto,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── 2FA ─────────────────────────────────────────────────────────────────────

    @Post('auth/2fa/enable')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Begin 2FA setup — returns QR code and secret' })
    enable2FA(@CurrentUser() user: any) {
        return this.authService.enable2FA(user.id);
    }

    @Post('auth/2fa/verify')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify TOTP code to complete 2FA setup' })
    verify2FA(
        @CurrentUser() user: any,
        @Body() dto: Verify2FADto,
        @Req() req: Request,
    ) {
        return this.authService.verify2FA(
            user.id,
            dto,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    @Post('auth/2fa/disable')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable 2FA (requires valid TOTP code)' })
    disable2FA(
        @CurrentUser() user: any,
        @Body() dto: Verify2FADto,
        @Req() req: Request,
    ) {
        return this.authService.disable2FA(
            user.id,
            dto,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    @Post('auth/2fa/login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: 'Login with email, password, and TOTP code' })
    loginWith2FA(@Body() dto: Login2FADto, @Req() req: Request) {
        return this.authService.loginWith2FA(
            dto,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────

    @Get('auth/google')
    @Public()
    @UseGuards(GoogleOAuthGuard)
    @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
    googleAuth() {
        // Passport handles the redirect
    }

    @Get('auth/google/callback')
    @Public()
    @UseGuards(GoogleOAuthGuard)
    @ApiOperation({ summary: 'Google OAuth2 callback' })
    async googleCallback(@Req() req: Request & { user: any }, @Res() res: Response) {
        const result = await this.authService.googleLogin(
            req.user,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        res.redirect(
            `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
        );
    }

    // ─── ME / PROFILE ────────────────────────────────────────────────────────────

    @Get('auth/me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    getProfile(@CurrentUser() user: any) {
        return this.authService.getProfile(user.id);
    }

    @Patch('auth/me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update current user profile' })
    updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
        return this.authService.updateProfile(user.id, dto);
    }

    // ─── SESSIONS ─────────────────────────────────────────────────────────────────

    @Get('auth/sessions')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all active sessions' })
    getSessions(@CurrentUser() user: any) {
        return this.authService.getActiveSessions(user.id);
    }

    @Delete('auth/sessions/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke a specific session' })
    revokeSession(
        @CurrentUser() user: any,
        @Param('id') sessionId: string,
        @Req() req: Request,
    ) {
        return this.authService.revokeSession(
            user.id,
            sessionId,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    @Delete('auth/sessions')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke all sessions' })
    revokeAllSessions(@CurrentUser() user: any, @Req() req: Request) {
        return this.authService.revokeAllSessions(
            user.id,
            '',
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── API KEYS ─────────────────────────────────────────────────────────────────

    @Get('auth/api-keys')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List API keys' })
    getApiKeys(@CurrentUser() user: any) {
        return this.authService.getUserApiKeys(user.id);
    }

    @Post('auth/api-keys')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new API key' })
    createApiKey(
        @CurrentUser() user: any,
        @Body() dto: CreateApiKeyDto,
        @Req() req: Request,
    ) {
        return this.authService.createApiKey(
            user.id,
            dto,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    @Delete('auth/api-keys/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Revoke an API key' })
    revokeApiKey(
        @CurrentUser() user: any,
        @Param('id') keyId: string,
        @Req() req: Request,
    ) {
        return this.authService.revokeApiKey(
            user.id,
            keyId,
            this.getClientIp(req),
            req.headers['user-agent'] || '',
        );
    }

    // ─── TOKEN INTROSPECTION ──────────────────────────────────────────────────────

    @Post('auth/token/introspect')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'OIDC-compatible token introspection' })
    introspect(@Body() dto: IntrospectTokenDto) {
        return this.authService.introspect(dto.token);
    }
}
