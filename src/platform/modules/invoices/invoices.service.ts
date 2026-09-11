import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

export interface InvoiceDetail {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  plan: string;
  amount: number;
  status: InvoiceStatus;
  displayStatus: string;
  date: string;
  issuedAt: Date;
  createdAt: Date;
}

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: { tenant: true; plan: true };
}>;

function formatStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapInvoice(invoice: InvoiceWithRelations): InvoiceDetail {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      tenantName: invoice.tenant.name,
      tenantEmail: invoice.tenant.email,
      plan: invoice.plan?.name ?? 'Standard Plan',
      amount: Number(invoice.amount),
      status: invoice.status,
      displayStatus: formatStatus(invoice.status),
      date: invoice.issuedAt.toISOString().slice(0, 10),
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
    };
  }

  async findMany(
    query: QueryInvoicesDto,
  ): Promise<PaginatedResponse<InvoiceDetail>> {
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.InvoiceWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.tenant = {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
          { ownerName: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
        include: { tenant: true, plan: true },
      }),
    ]);

    return {
      data: items.map((i: InvoiceWithRelations) => this.mapInvoice(i)),
      meta: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(id: string): Promise<InvoiceDetail> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { tenant: true, plan: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    return this.mapInvoice(invoice);
  }

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceDetail> {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Invoice with ID '${id}' not found`);
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: { tenant: true, plan: true },
    });

    return this.mapInvoice(updated);
  }
}
