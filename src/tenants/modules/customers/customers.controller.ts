import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import type { AuthUser } from '../../../auth/auth.types';
import { CurrentUser } from '../../../auth/decorators/current-user/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('tenant customers')
@ApiBearerAuth()
@Controller('tenants/:slug/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List and search customers with pagination' })
  findMany(
    @Param('slug') slug: string,
    @Query() query: QueryCustomersDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.findMany(slug, query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.findOne(slug, id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.create(slug, dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.update(slug, id, dto, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  remove(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customersService.remove(slug, id, user.tenantId);
  }
}
