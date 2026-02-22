import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
    ) {
        super();
    }

    async validate(req: Request): Promise<any> {
        const apiKey = req.headers['x-api-key'] as string;
        if (!apiKey) {
            throw new UnauthorizedException('API key not provided');
        }

        // Find all active, non-expired keys
        const keys = await this.apiKeyRepository.find({
            where: { isActive: true },
            relations: ['user'],
        });

        for (const keyRecord of keys) {
            if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) continue;
            const isMatch = await bcrypt.compare(apiKey, keyRecord.keyHash);
            if (isMatch) {
                // Update last used
                await this.apiKeyRepository.update(keyRecord.id, {
                    lastUsedAt: new Date(),
                });
                return {
                    id: keyRecord.user.id,
                    email: keyRecord.user.email,
                    roles: [],
                    permissions: keyRecord.scopes || [],
                    apiKeyId: keyRecord.id,
                };
            }
        }

        throw new UnauthorizedException('Invalid API key');
    }
}
