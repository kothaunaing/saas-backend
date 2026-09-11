import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { AuthModule } from '../../../auth/auth.module';
import { CustomerAccountController } from './customer-account.controller';
import { CustomerAccountService } from './customer-account.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CustomerAccountController],
  providers: [CustomerAccountService],
})
export class CustomerAccountModule {}
