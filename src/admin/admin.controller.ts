import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/user.entity';
import { RolesService } from '../roles/roles.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../auth/entities/audit-log.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(
        private usersService: UsersService,
        private rolesService: RolesService,
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
    ) { }

    @Get('users')
    @ApiOperation({ summary: 'List all users (paginated)' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    findAllUsers(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
    ) {
        return this.usersService.findAll(parseInt(page), parseInt(limit));
    }

    @Get('users/:id')
    @ApiOperation({ summary: 'Get a specific user by ID' })
    findUser(@Param('id') id: string) {
        return this.usersService.findOneById(id);
    }

    @Patch('users/:id/status')
    @ApiOperation({ summary: 'Update user status (active/suspended/locked)' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: UserStatus,
    ) {
        return this.usersService.updateStatus(id, status);
    }

    @Patch('users/:id/roles')
    @ApiOperation({ summary: 'Assign roles to a user' })
    async assignRoles(
        @Param('id') userId: string,
        @Body('roles') roleNames: string[],
    ) {
        const roles = await this.rolesService.findByNames(roleNames);
        return this.usersService.assignRoles(userId, roles);
    }

    @Get('audit-logs')
    @ApiOperation({ summary: 'Get audit logs (paginated)' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'userId', required: false })
    async getAuditLogs(
        @Query('page') page = '1',
        @Query('limit') limit = '50',
        @Query('userId') userId?: string,
    ) {
        const qb = this.auditRepo.createQueryBuilder('log')
            .orderBy('log.createdAt', 'DESC')
            .skip((parseInt(page) - 1) * parseInt(limit))
            .take(parseInt(limit));

        if (userId) qb.where('log.userId = :userId', { userId });

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: parseInt(page), limit: parseInt(limit) };
    }
}
