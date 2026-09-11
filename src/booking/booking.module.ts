import { Module } from '@nestjs/common';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { CustomerAccountModule } from './modules/customer-account/customer-account.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [PublicBookingModule, CustomerAccountModule, NotificationsModule],
})
export class BookingModule {}
