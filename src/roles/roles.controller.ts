import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
    constructor(private rolesService: RolesService) { }

    @Get()
    @ApiOperation({ summary: 'List all roles' })
    findAll() {
        return this.rolesService.findAll();
    }

    @Post()
    @Roles('admin')
    @ApiOperation({ summary: 'Create a new role (admin only)' })
    create(
        @Body()
        body: {
            name: string;
            description?: string;
            permissions?: string[];
            isDefault?: boolean;
        },
    ) {
        return this.rolesService.create(body.name, body.description, body.permissions, body.isDefault);
    }
}
