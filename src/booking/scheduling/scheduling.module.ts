import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { SchedulingService } from './scheduling.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
