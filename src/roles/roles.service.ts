import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Role)
        private roleRepo: Repository<Role>,
    ) { }

    async findAll(): Promise<Role[]> {
        return this.roleRepo.find({ order: { name: 'ASC' } });
    }

    async findByName(name: string): Promise<Role | null> {
        return this.roleRepo.findOne({ where: { name } });
    }

    async findByNames(names: string[]): Promise<Role[]> {
        return this.roleRepo
            .createQueryBuilder('role')
            .where('role.name IN (:...names)', { names })
            .getMany();
    }

    async create(
        name: string,
        description?: string,
        permissions?: string[],
        isDefault?: boolean,
    ): Promise<Role> {
        const role = this.roleRepo.create({ name, description, permissions, isDefault });
        return this.roleRepo.save(role);
    }

    /**
     * Seeds the default roles on application startup.
     *
     * Role hierarchy (highest → lowest):
     *  superadmin – System owner. Full irrevocable access ('*').
     *               Cannot be managed via the admin API \u2014 assign manually in DB.
     *  admin      – Application admin. Manages users, content, and audit logs.
     *               Explicitly scoped so admins cannot self-escalate to superadmin.
     *  moderator  – Content moderation only. Can read users but not modify them.
     *  user       – Default role assigned at registration.
     */
    async seedDefaultRoles(): Promise<void> {
        const defaults: Array<{
            name: string;
            description: string;
            permissions: string[];
            isDefault: boolean;
        }> = [
                {
                    name: 'superadmin',
                    description: 'System owner — full irrevocable access. Assign manually only.',
                    permissions: ['*'],
                    isDefault: false,
                },
                {
                    name: 'admin',
                    description: 'Application administrator — manages users, roles, and content.',
                    // Explicitly scoped: cannot manage superadmins or grant superadmin role
                    permissions: ['users:*', 'roles:read', 'audit:read', 'content:*', 'api-keys:*'],
                    isDefault: false,
                },
                {
                    name: 'moderator',
                    description: 'Content moderator — can read users and manage content.',
                    permissions: ['users:read', 'content:*'],
                    isDefault: false,
                },
                {
                    name: 'user',
                    description: 'Default authenticated user.',
                    permissions: ['profile:read', 'profile:write'],
                    isDefault: true,
                },
            ];

        for (const roleData of defaults) {
            const existing = await this.findByName(roleData.name);
            if (!existing) {
                await this.create(
                    roleData.name,
                    roleData.description,
                    roleData.permissions,
                    roleData.isDefault,
                );
            }
        }
    }
}
