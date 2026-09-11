import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { TenantsModule } from './tenants/tenants.module';
import { PlatformModule } from './platform/platform.module';
import { BookingModule } from './booking/booking.module';
import { AuthModule } from './auth/auth.module';
import { SchedulingModule } from './booking/scheduling/scheduling.module';
import { APP_FILTER } from '@nestjs/core';
import { SystemErrorFilter } from './common/filters/system-error.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    TenantsModule,
    PlatformModule,
    BookingModule,
    AuthModule,
    SchedulingModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: SystemErrorFilter }],
})
export class AppModule {}
