import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../database/prisma/prisma.module';
import { AuthModule } from '../../../auth/auth.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
})
export class WorkspaceModule {}
