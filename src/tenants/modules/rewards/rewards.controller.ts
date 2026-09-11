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
import { CreateRewardDto } from './dto/create-reward.dto';
import { QueryRewardsDto } from './dto/query-rewards.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardsService } from './rewards.service';

@ApiTags('tenant rewards')
@ApiBearerAuth()
@Controller('tenants/:slug/rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT_ADMIN)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search rewards with pagination' })
  findMany(
    @Param('slug') slug: string,
    @Query() query: QueryRewardsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewardsService.findMany(slug, query, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reward by ID' })
  findOne(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewardsService.findOne(slug, id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new reward' })
  create(
    @Param('slug') slug: string,
    @Body() dto: CreateRewardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewardsService.create(slug, dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reward' })
  update(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateRewardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewardsService.update(slug, id, dto, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reward' })
  remove(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewardsService.remove(slug, id, user.tenantId);
  }
}
