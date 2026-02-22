import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/user.entity';

export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
    permissions: string[];
    jti?: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        const opts: StrategyOptionsWithoutRequest = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (req) => req?.cookies?.['access_token'] || null,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.accessSecret') ?? 'fallback-secret',
        };
        super(opts);
    }

    async validate(payload: JwtPayload) {
        const user = await this.usersService.findOneById(payload.sub);
        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User is not active');
        }
        return {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
        };
    }
}
