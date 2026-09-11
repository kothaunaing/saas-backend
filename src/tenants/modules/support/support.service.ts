import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}
  private async authorize(slug: string, tenantId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenantId || tenant.id !== tenantId)
      throw new ForbiddenException('You cannot access this tenant');
    return tenant;
  }
  async list(slug: string, tenantId: string | null) {
    const tenant = await this.authorize(slug, tenantId);
    return this.prisma.ticket.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });
  }
  async create(
    slug: string,
    tenantId: string | null,
    dto: CreateSupportTicketDto,
  ) {
    const tenant = await this.authorize(slug, tenantId);
    return this.prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        subject: dto.subject,
        category: dto.category,
        message: dto.message,
        priority: dto.priority ?? 'NORMAL',
      },
    });
  }
}
