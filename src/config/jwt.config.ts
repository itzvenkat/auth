import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-prod',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-prod',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));
