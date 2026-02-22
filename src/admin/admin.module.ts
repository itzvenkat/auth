import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../auth/entities/audit-log.entity';

@Module({
    imports: [UsersModule, RolesModule, TypeOrmModule.forFeature([AuditLog])],
    controllers: [AdminController],
})
export class AdminModule { }
