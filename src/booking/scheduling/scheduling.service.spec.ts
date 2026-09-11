import { BadRequestException, ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Prisma } from '../../generated/prisma/client';
import { SchedulingService } from './scheduling.service';

describe('SchedulingService', () => {
  const service = new SchedulingService();
  const request = {
    tenantId: 'tenant-1',
    serviceId: 'service-1',
    staffId: 'staff-1',
    startsAt: new Date('2026-09-14T03:00:00.000Z'), // 09:30 Asia/Yangon
    timezone: 'Asia/Yangon',
  };

  function database(overrides?: {
    service?: { duration: number } | null;
    staff?: {
      hours: Array<{
        dayOfWeek: number;
        enabled: boolean;
        startTime: string;
        endTime: string;
        breaks: Array<{ startTime: string; endTime: string }>;
      }>;
    } | null;
    appointments?: Array<{
      startsAt: Date;
      service: { duration: number };
    }>;
  }): Prisma.TransactionClient {
    return {
      $executeRaw: jest.fn(),
      service: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            overrides && 'service' in overrides
              ? overrides.service
              : { duration: 60 },
          ),
      },
      staff: {
        findFirst: jest.fn().mockResolvedValue(
          overrides && 'staff' in overrides
            ? overrides.staff
            : {
                hours: [
                  {
                    dayOfWeek: 1,
                    enabled: true,
                    startTime: '09:00',
                    endTime: '17:00',
                    breaks: [],
                  },
                ],
              },
        ),
      },
      appointment: {
        findMany: jest.fn().mockResolvedValue(overrides?.appointments ?? []),
      },
    } as unknown as Prisma.TransactionClient;
  }

  it('accepts a qualified staff member during working hours', async () => {
    await expect(
      service.assertAvailable(database(), request),
    ).resolves.toBeUndefined();
  });

  it('rejects an unqualified or inactive staff member', async () => {
    await expect(
      service.assertAvailable(database({ staff: null }), request),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an appointment overlapping a break', async () => {
    const db = database({
      staff: {
        hours: [
          {
            dayOfWeek: 1,
            enabled: true,
            startTime: '09:00',
            endTime: '17:00',
            breaks: [{ startTime: '09:45', endTime: '10:15' }],
          },
        ],
      },
    });
    await expect(service.assertAvailable(db, request)).rejects.toThrow(
      'Appointment overlaps a staff break',
    );
  });

  it('rejects an overlapping appointment', async () => {
    const db = database({
      appointments: [
        {
          startsAt: new Date('2026-09-14T03:15:00.000Z'),
          service: { duration: 60 },
        },
      ],
    });
    await expect(service.assertAvailable(db, request)).rejects.toThrow(
      ConflictException,
    );
  });

  it('takes a transaction-scoped lock when requested', async () => {
    const db = database();
    await service.assertAvailable(db, { ...request, lockStaff: true });
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
