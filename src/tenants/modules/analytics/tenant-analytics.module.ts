import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { TenantAnalyticsController } from './tenant-analytics.controller';
import { TenantAnalyticsService } from './tenant-analytics.service';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TenantAnalyticsController],
  providers: [TenantAnalyticsService],
})
export class TenantAnalyticsModule {}
