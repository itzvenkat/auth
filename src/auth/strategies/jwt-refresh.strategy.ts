import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const opts: StrategyOptionsWithRequest = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => req?.body?.refreshToken || req?.cookies?.['refresh_token'] || null,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.refreshSecret') ?? 'fallback-refresh-secret',
            passReqToCallback: true,
        };
        super(opts);
    }

    async validate(req: Request, payload: { sub: string; jti: string }) {
        const refreshToken = req.body?.refreshToken || req.cookies?.['refresh_token'];
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const tokenRecord = await this.authService.validateRefreshToken(payload.sub, refreshToken);
        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        return { id: payload.sub, tokenId: tokenRecord.id, refreshToken };
    }
}
