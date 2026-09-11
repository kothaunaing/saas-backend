import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { AuthModule } from '../../../auth/auth.module';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
