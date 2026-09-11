import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ErrorsController],
  providers: [ErrorsService],
})
export class PlatformErrorsModule {}
