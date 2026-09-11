import { Module } from '@nestjs/common';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ServicesModule } from './modules/services/services.module';
import { StaffModule } from './modules/staff/staff.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { RewardsModule } from './modules/rewards/rewards.module';

@Module({
  imports: [
    WorkspaceModule,
    CustomersModule,
    ServicesModule,
    StaffModule,
    AppointmentsModule,
    RewardsModule,
  ],
})
export class TenantsModule {}
