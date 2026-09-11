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
import { Roles } from '../../../auth/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('platform plans')
@ApiBearerAuth()
@Controller('platform/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List and search plans with pagination' })
  findMany(@Query() query: QueryPlansDto) {
    return this.plansService.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by ID' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new plan tier' })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan tier' })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan tier' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
