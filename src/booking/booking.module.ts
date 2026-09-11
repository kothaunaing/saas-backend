import { Module } from '@nestjs/common';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { CustomerAccountModule } from './modules/customer-account/customer-account.module';

@Module({
  imports: [PublicBookingModule, CustomerAccountModule],
})
export class BookingModule {}
