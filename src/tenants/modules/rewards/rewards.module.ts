import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
