import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class PlatformTicketsModule {}
