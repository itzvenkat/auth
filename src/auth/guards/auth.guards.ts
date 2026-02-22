import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') { }

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') { }

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') { }

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') { }
