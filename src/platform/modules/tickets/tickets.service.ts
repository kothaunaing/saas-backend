import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TicketPriority,
  TicketStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaginatedResponse } from '../../../common/dto/page-size.dto';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';

export interface TicketDetail {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  displayPriority: string;
  status: TicketStatus;
  displayStatus: string;
  message: string;
  created: string;
  createdAt: Date;
  updatedAt: Date;
}

type TicketWithTenant = Prisma.TicketGetPayload<{
  include: { tenant: true };
}>;

function formatStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTicket(ticket: TicketWithTenant): TicketDetail {
    return {
      id: ticket.id,
      tenantId: ticket.tenantId,
      tenantName: ticket.tenant.name,
      tenantEmail: ticket.tenant.email,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      displayPriority: formatStatus(ticket.priority),
      status: ticket.status,
      displayStatus: formatStatus(ticket.status),
      message: ticket.message,
      created: ticket.createdAt.toISOString(),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  async findMany(
    query: QueryTicketsDto,
  ): Promise<PaginatedResponse<TicketDetail>> {
    const page = query.page > 0 ? query.page : 1;
    const size = query.size > 0 ? query.size : 10;
    const skip = (page - 1) * size;

    const where: Prisma.TicketWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { subject: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { message: { contains: s, mode: 'insensitive' } },
        { tenant: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: { tenant: true },
      }),
    ]);

    return {
      data: items.map((t: TicketWithTenant) => this.mapTicket(t)),
      meta: {
        total,
        page,
        size,
        totalPages: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(id: string): Promise<TicketDetail> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID '${id}' not found`);
    }

    return this.mapTicket(ticket);
  }

  async create(dto: CreateTicketDto): Promise<TicketDetail> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID '${dto.tenantId}' not found`);
    }

    const created = await this.prisma.ticket.create({
      data: {
        tenantId: dto.tenantId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority ?? TicketPriority.NORMAL,
        message: dto.message,
      },
      include: { tenant: true },
    });

    return this.mapTicket(created);
  }

  async update(id: string, dto: UpdateTicketDto): Promise<TicketDetail> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket with ID '${id}' not found`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: dto,
      include: { tenant: true },
    });

    return this.mapTicket(updated);
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Ticket with ID '${id}' not found`);
    }

    await this.prisma.ticket.delete({ where: { id } });
    return { success: true, id };
  }
}
