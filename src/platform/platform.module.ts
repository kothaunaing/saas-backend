import { Module } from '@nestjs/common';
import { PlatformTenantsModule } from './modules/tenants/tenants.module';
import { PlatformPlansModule } from './modules/plans/plans.module';
import { PlatformInvoicesModule } from './modules/invoices/invoices.module';
import { PlatformTicketsModule } from './modules/tickets/tickets.module';
import { PlatformAnalyticsModule } from './modules/analytics/analytics.module';
import { PlatformSettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    PlatformTenantsModule,
    PlatformPlansModule,
    PlatformInvoicesModule,
    PlatformTicketsModule,
    PlatformAnalyticsModule,
    PlatformSettingsModule,
  ],
})
export class PlatformModule {}
