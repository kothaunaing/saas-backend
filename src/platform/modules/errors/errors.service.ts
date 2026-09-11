import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
@Injectable()
export class ErrorsService {
  constructor(private readonly prisma: PrismaService) {}
  async findMany(status?: 'OPEN' | 'RESOLVED') {
    return this.prisma.systemError.findMany({
      where: status ? { status } : {},
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }
  async resolve(id: string) {
    const existing = await this.prisma.systemError.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('System error not found');
    return this.prisma.systemError.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }
}
