import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import 'dotenv/config';
import {
  AppointmentStatus,
  InvoiceStatus,
  PrismaClient,
  TenantStatus,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const password = 'password123';
const utcDay = (offset: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
};

async function seedHours(staffId: string, start = '09:00', end = '18:00') {
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const workDay = await prisma.workDay.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
      update: { enabled: dayOfWeek !== 0, startTime: start, endTime: end },
      create: {
        id: `seed-hours-${staffId}-${dayOfWeek}`,
        staffId,
        dayOfWeek,
        enabled: dayOfWeek !== 0,
        startTime: start,
        endTime: end,
      },
    });
    await prisma.staffBreak.deleteMany({ where: { workDayId: workDay.id } });
    if (dayOfWeek !== 0)
      await prisma.staffBreak.create({
        data: {
          id: `seed-break-${staffId}-${dayOfWeek}`,
          workDayId: workDay.id,
          startTime: '12:00',
          endTime: '13:00',
        },
      });
  }
}

async function main() {
  const passwordHash = await hash(password, 12);
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: 'Basic' },
      update: {
        price: 19,
        interval: 'month',
        tenantLimit: 1,
        staffLimit: 3,
        features: [
          'Appointment scheduling',
          'Customer management',
          'Basic reports',
        ],
        active: true,
      },
      create: {
        id: 'seed-plan-basic',
        name: 'Basic',
        price: 19,
        interval: 'month',
        tenantLimit: 1,
        staffLimit: 3,
        features: [
          'Appointment scheduling',
          'Customer management',
          'Basic reports',
        ],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'Pro' },
      update: {
        price: 49,
        interval: 'month',
        tenantLimit: 2,
        staffLimit: 10,
        features: [
          'Everything in Basic',
          'Loyalty and rewards',
          'Advanced analytics',
        ],
        active: true,
      },
      create: {
        id: 'seed-plan-pro',
        name: 'Pro',
        price: 49,
        interval: 'month',
        tenantLimit: 2,
        staffLimit: 10,
        features: [
          'Everything in Basic',
          'Loyalty and rewards',
          'Advanced analytics',
        ],
      },
    }),
    prisma.plan.upsert({
      where: { name: 'Enterprise' },
      update: {
        price: 99,
        interval: 'month',
        tenantLimit: null,
        staffLimit: null,
        features: [
          'Everything in Pro',
          'Multiple locations',
          'Priority support',
        ],
        active: true,
      },
      create: {
        id: 'seed-plan-enterprise',
        name: 'Enterprise',
        price: 99,
        interval: 'month',
        features: [
          'Everything in Pro',
          'Multiple locations',
          'Priority support',
        ],
      },
    }),
  ]);
  const [basic, pro, enterprise] = plans;

  const tenants = await Promise.all([
    prisma.tenant.upsert({
      where: { slug: 'serenity' },
      update: { status: TenantStatus.ACTIVE, planId: pro.id },
      create: {
        id: 'seed-tenant-serenity',
        slug: 'serenity',
        name: 'Serenity Spa & Salon',
        ownerName: 'Nandar Aye',
        email: 'owner@serenity.com',
        phone: '+95 9 250 111 000',
        address: '42 Inya Road, Kamayut',
        city: 'Yangon',
        tagline: 'Unhurried treatments in the middle of the city',
        description:
          'Personal salon and spa treatments delivered by an experienced team.',
        imageUrl: '/images/spa.jpg',
        amenities: [
          'Free parking',
          'Herbal tea bar',
          'Private rooms',
          'Card and mobile payment',
        ],
        currency: 'USD',
        timezone: 'Asia/Yangon',
        confirmation: true,
        reminders: true,
        loyalty: true,
        pointsPerDollar: 4,
        status: TenantStatus.ACTIVE,
        planId: pro.id,
      },
    }),
    prisma.tenant.upsert({
      where: { slug: 'lotus' },
      update: { status: TenantStatus.TRIAL, planId: basic.id },
      create: {
        id: 'seed-tenant-lotus',
        slug: 'lotus',
        name: 'Lotus Beauty Lounge',
        ownerName: 'Nilar Win',
        email: 'owner@lotus.example',
        phone: '+95 9 420 555 880',
        address: '18 University Avenue, Bahan',
        city: 'Yangon',
        tagline: 'Colour specialists and thoughtful beauty care',
        description:
          'A neighbourhood salon for cuts, colour, nails, and personal care.',
        imageUrl: '/images/salon.jpg',
        amenities: ['Coffee bar', 'Free Wi-Fi', 'Card and mobile payment'],
        currency: 'USD',
        timezone: 'Asia/Yangon',
        confirmation: true,
        reminders: true,
        loyalty: true,
        pointsPerDollar: 2,
        status: TenantStatus.TRIAL,
        planId: basic.id,
      },
    }),
    prisma.tenant.upsert({
      where: { slug: 'aurora' },
      update: { status: TenantStatus.PENDING, planId: enterprise.id },
      create: {
        id: 'seed-tenant-aurora',
        slug: 'aurora',
        name: 'Aurora Wellness Studio',
        ownerName: 'Khin Thiri',
        email: 'owner@aurora.example',
        city: 'Mandalay',
        amenities: [],
        currency: 'USD',
        timezone: 'Asia/Yangon',
        status: TenantStatus.PENDING,
        planId: enterprise.id,
      },
    }),
    prisma.tenant.upsert({
      where: { slug: 'orchid' },
      update: { status: TenantStatus.SUSPENDED, planId: pro.id },
      create: {
        id: 'seed-tenant-orchid',
        slug: 'orchid',
        name: 'Orchid Hair House',
        ownerName: 'Moe Sandi',
        email: 'owner@orchid.example',
        city: 'Naypyidaw',
        amenities: [],
        currency: 'USD',
        timezone: 'Asia/Yangon',
        status: TenantStatus.SUSPENDED,
        planId: pro.id,
      },
    }),
  ]);
  const [serenity, lotus, aurora, orchid] = tenants;

  for (const [id, tenantId, name, address, city] of [
    [
      'seed-location-serenity-main',
      serenity.id,
      'Main salon',
      '42 Inya Road, Kamayut',
      'Yangon',
    ],
    [
      'seed-location-serenity-river',
      serenity.id,
      'Riverside branch',
      '8 Strand Road',
      'Yangon',
    ],
    [
      'seed-location-lotus-main',
      lotus.id,
      'Beauty lounge',
      '18 University Avenue, Bahan',
      'Yangon',
    ],
  ] as const)
    await prisma.location.upsert({
      where: { id },
      update: { name, address, city, timezone: 'Asia/Yangon' },
      create: { id, tenantId, name, address, city, timezone: 'Asia/Yangon' },
    });

  const serviceRows = [
    [serenity.id, 'Hydrating Facial', 'Facial', 60, 55],
    [serenity.id, 'Anti-Ageing Facial', 'Facial', 75, 85],
    [serenity.id, 'Body Scrub and Wrap', 'Body', 90, 70],
    [serenity.id, 'Signature Cut and Style', 'Hair', 60, 45],
    [serenity.id, 'Aromatherapy Massage', 'Massage', 60, 65],
    [serenity.id, 'Gel Manicure', 'Nails', 45, 32],
    [serenity.id, 'Hair Colour and Treatment', 'Hair', 120, 110],
    [lotus.id, 'Signature Cut and Style', 'Hair', 60, 45],
    [lotus.id, 'Balayage and Gloss', 'Hair', 150, 220],
    [lotus.id, 'Gel Manicure', 'Nails', 45, 32],
    [lotus.id, 'Brow Shape', 'Beauty', 30, 24],
  ] as const;
  const services = new Map<string, string>();
  for (const [tenantId, name, category, duration, price] of serviceRows) {
    const row = await prisma.service.upsert({
      where: { tenantId_name: { tenantId, name } },
      update: {
        category,
        duration,
        price,
        active: true,
        description: `${name} with a personalized consultation.`,
      },
      create: {
        id: `seed-service-${services.size + 1}`,
        tenantId,
        name,
        category,
        duration,
        price,
        active: true,
        description: `${name} with a personalized consultation.`,
      },
    });
    services.set(`${tenantId}:${name}`, row.id);
  }

  const staffRows = [
    [
      serenity.id,
      'Nandar Aye',
      'owner@serenity.com',
      'Owner',
      ['Signature Cut and Style', 'Hair Colour and Treatment', 'Gel Manicure'],
    ],
    [
      serenity.id,
      'Thiri Ko',
      'manager@serenity.com',
      'Manager',
      [
        'Hydrating Facial',
        'Anti-Ageing Facial',
        'Body Scrub and Wrap',
        'Aromatherapy Massage',
      ],
    ],
    [
      serenity.id,
      'May Zin',
      'may.zin@serenity.com',
      'Stylist',
      ['Signature Cut and Style', 'Gel Manicure', 'Hair Colour and Treatment'],
    ],
    [
      serenity.id,
      'Su Latt',
      'su.latt@serenity.com',
      'Therapist',
      ['Body Scrub and Wrap', 'Aromatherapy Massage'],
    ],
    [
      serenity.id,
      'Hnin Wai',
      'hnin.wai@serenity.com',
      'Aesthetician',
      ['Hydrating Facial', 'Anti-Ageing Facial'],
    ],
    [
      lotus.id,
      'Nilar Win',
      'owner@lotus.example',
      'Owner',
      ['Signature Cut and Style', 'Balayage and Gloss'],
    ],
    [
      lotus.id,
      'Su Su Hlaing',
      'su@lotus.example',
      'Nail artist',
      ['Gel Manicure', 'Brow Shape'],
    ],
  ] as const;
  const staff = new Map<string, string>();
  for (const [tenantId, name, email, role, skills] of staffRows) {
    const row = await prisma.staff.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: { name, role, active: true },
      create: {
        id: `seed-staff-${staff.size + 1}`,
        tenantId,
        name,
        email,
        phone: '+95 9 555 010 000',
        role,
        active: true,
      },
    });
    staff.set(email, row.id);
    for (const name of skills) {
      const serviceId = services.get(`${tenantId}:${name}`)!;
      await prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: row.id, serviceId } },
        update: {},
        create: { staffId: row.id, serviceId },
      });
    }
    await seedHours(row.id);
  }

  const customerRows = [
    [
      serenity.id,
      'Ei Ei Khaing',
      'ei.khaing@example.com',
      1240,
      'Sensitive skin; patch test new products.',
    ],
    [serenity.id, 'Zin Mar Oo', 'zinmar.oo@example.com', 860, null],
    [serenity.id, 'Htet Htet Lin', 'htet.lin@example.com', 180, null],
    [serenity.id, 'Aung Kyaw Moe', 'aung.moe@example.com', 320, null],
    [
      serenity.id,
      'Phyu Phyu Win',
      'phyu.win@example.com',
      2100,
      'Prefers quiet treatment rooms.',
    ],
    [serenity.id, 'Nilar Soe', 'nilar.soe@example.com', 40, null],
    [serenity.id, 'Thandar Kyaw', 'thandar.kyaw@example.com', 640, null],
    [serenity.id, 'Su Myat Noe', 'su.myat@example.com', 420, null],
    [lotus.id, 'Mya Mya Win', 'mya@customer.example', 380, null],
    [
      lotus.id,
      'Cherry Hlaing',
      'cherry@customer.example',
      720,
      'Prefers afternoon visits.',
    ],
  ] as const;
  const customers = new Map<string, string>();
  for (const [tenantId, name, email, points, notes] of customerRows) {
    const row = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: { name, points, notes },
      create: {
        id: `seed-customer-${customers.size + 1}`,
        tenantId,
        name,
        email,
        phone: '+95 9 777 020 000',
        points,
        notes,
      },
    });
    customers.set(`${tenantId}:${email}`, row.id);
  }

  const appointments = [
    [
      'seed-appt-1',
      serenity.id,
      'ei.khaing@example.com',
      'Hydrating Facial',
      'hnin.wai@serenity.com',
      -35,
      3,
      AppointmentStatus.COMPLETED,
    ],
    [
      'seed-appt-2',
      serenity.id,
      'phyu.win@example.com',
      'Signature Cut and Style',
      'owner@serenity.com',
      -28,
      4,
      AppointmentStatus.COMPLETED,
    ],
    [
      'seed-appt-3',
      serenity.id,
      'aung.moe@example.com',
      'Aromatherapy Massage',
      'su.latt@serenity.com',
      -21,
      5,
      AppointmentStatus.NO_SHOW,
    ],
    [
      'seed-appt-4',
      serenity.id,
      'zinmar.oo@example.com',
      'Anti-Ageing Facial',
      'manager@serenity.com',
      -14,
      6,
      AppointmentStatus.COMPLETED,
    ],
    [
      'seed-appt-5',
      serenity.id,
      'thandar.kyaw@example.com',
      'Gel Manicure',
      'may.zin@serenity.com',
      -7,
      7,
      AppointmentStatus.CANCELLED,
    ],
    [
      'seed-appt-6',
      serenity.id,
      'su.myat@example.com',
      'Body Scrub and Wrap',
      'manager@serenity.com',
      -2,
      8,
      AppointmentStatus.COMPLETED,
    ],
    [
      'seed-appt-7',
      serenity.id,
      'nilar.soe@example.com',
      'Signature Cut and Style',
      'owner@serenity.com',
      2,
      4,
      AppointmentStatus.CONFIRMED,
    ],
    [
      'seed-appt-8',
      serenity.id,
      'ei.khaing@example.com',
      'Hydrating Facial',
      'hnin.wai@serenity.com',
      3,
      5,
      AppointmentStatus.CONFIRMED,
    ],
    [
      'seed-appt-9',
      serenity.id,
      'htet.lin@example.com',
      'Aromatherapy Massage',
      'su.latt@serenity.com',
      5,
      6,
      AppointmentStatus.PENDING,
    ],
    [
      'seed-appt-10',
      lotus.id,
      'mya@customer.example',
      'Gel Manicure',
      'su@lotus.example',
      -10,
      7,
      AppointmentStatus.COMPLETED,
    ],
    [
      'seed-appt-11',
      lotus.id,
      'cherry@customer.example',
      'Balayage and Gloss',
      'owner@lotus.example',
      4,
      4,
      AppointmentStatus.CONFIRMED,
    ],
  ] as const;
  for (const [
    id,
    tenantId,
    customerEmail,
    serviceName,
    staffEmail,
    offset,
    hour,
    status,
  ] of appointments)
    await prisma.appointment.upsert({
      where: { id },
      update: { startsAt: utcDay(offset, hour), status },
      create: {
        id,
        tenantId,
        customerId: customers.get(`${tenantId}:${customerEmail}`)!,
        serviceId: services.get(`${tenantId}:${serviceName}`)!,
        staffId: staff.get(staffEmail)!,
        startsAt: utcDay(offset, hour),
        status,
        notes:
          status === AppointmentStatus.PENDING
            ? 'First visit consultation requested.'
            : null,
        loyaltyPointsAwarded: status === AppointmentStatus.COMPLETED ? 100 : 0,
      },
    });

  for (const [
    id,
    appointmentId,
    tenantId,
    customerEmail,
    serviceName,
    staffEmail,
    authorName,
    rating,
    text,
  ] of [
    [
      'seed-review-1',
      'seed-appt-1',
      serenity.id,
      'ei.khaing@example.com',
      'Hydrating Facial',
      'hnin.wai@serenity.com',
      'Ei Ei Khaing',
      5,
      'Thoughtful consultation and excellent care.',
    ],
    [
      'seed-review-2',
      'seed-appt-2',
      serenity.id,
      'phyu.win@example.com',
      'Signature Cut and Style',
      'owner@serenity.com',
      'Phyu Phyu Win',
      5,
      'A careful cut that is easy to style.',
    ],
    [
      'seed-review-3',
      'seed-appt-10',
      lotus.id,
      'mya@customer.example',
      'Gel Manicure',
      'su@lotus.example',
      'Mya Mya Win',
      4,
      'Welcoming team and beautiful finish.',
    ],
  ] as const)
    await prisma.review.upsert({
      where: { appointmentId },
      update: { rating, text },
      create: {
        id,
        appointmentId,
        tenantId,
        customerId: customers.get(`${tenantId}:${customerEmail}`),
        serviceId: services.get(`${tenantId}:${serviceName}`),
        staffId: staff.get(staffEmail),
        authorName,
        rating,
        text,
      },
    });

  for (const [id, tenantId, name, points, description] of [
    [
      'seed-reward-1',
      serenity.id,
      '$10 service credit',
      500,
      'Credit toward the next completed visit.',
    ],
    [
      'seed-reward-2',
      serenity.id,
      'Complimentary gel manicure',
      1500,
      'A gel manicure at no service charge.',
    ],
    [
      'seed-reward-3',
      serenity.id,
      'Signature facial experience',
      2500,
      'A complete signature facial.',
    ],
    [
      'seed-reward-4',
      lotus.id,
      '$5 beauty credit',
      300,
      'Credit toward a beauty service.',
    ],
  ] as const)
    await prisma.reward.upsert({
      where: { id },
      update: { name, points, description, active: true },
      create: { id, tenantId, name, points, description, active: true },
    });

  for (const [id, tenantId, planId, amount, status, offset] of [
    ['seed-invoice-1', serenity.id, pro.id, 49, InvoiceStatus.PAID, -60],
    ['seed-invoice-2', serenity.id, pro.id, 49, InvoiceStatus.PAID, -30],
    ['seed-invoice-3', serenity.id, pro.id, 49, InvoiceStatus.DUE, 0],
    ['seed-invoice-4', lotus.id, basic.id, 19, InvoiceStatus.PAID, -30],
    ['seed-invoice-5', lotus.id, basic.id, 19, InvoiceStatus.FAILED, 0],
    ['seed-invoice-6', orchid.id, pro.id, 49, InvoiceStatus.REFUNDED, -20],
  ] as const)
    await prisma.invoice.upsert({
      where: { id },
      update: { status, amount },
      create: {
        id,
        tenantId,
        planId,
        amount,
        status,
        issuedAt: utcDay(offset, 0),
      },
    });
  for (const [id, tenantId, brand, last4, month, year] of [
    ['seed-payment-serenity', serenity.id, 'Visa', '4242', 8, 2028],
    ['seed-payment-lotus', lotus.id, 'Mastercard', '4444', 4, 2029],
  ] as const)
    await prisma.paymentMethod.upsert({
      where: { id },
      update: { brand, last4, expMonth: month, expYear: year, isDefault: true },
      create: {
        id,
        tenantId,
        brand,
        last4,
        expMonth: month,
        expYear: year,
        isDefault: true,
      },
    });

  for (const [id, tenantId, subject, category, priority, status, message] of [
    [
      'seed-ticket-1',
      serenity.id,
      'Invoice receipt request',
      'Billing',
      TicketPriority.NORMAL,
      TicketStatus.RESOLVED,
      'Please provide the latest paid invoice receipt.',
    ],
    [
      'seed-ticket-2',
      lotus.id,
      'SMS reminder delivery',
      'Notifications',
      TicketPriority.HIGH,
      TicketStatus.IN_PROGRESS,
      'A customer did not receive an SMS reminder.',
    ],
    [
      'seed-ticket-3',
      aurora.id,
      'Account approval',
      'Onboarding',
      TicketPriority.NORMAL,
      TicketStatus.OPEN,
      'Please review our pending business account.',
    ],
  ] as const)
    await prisma.ticket.upsert({
      where: { id },
      update: { priority, status, message },
      create: { id, tenantId, subject, category, priority, status, message },
    });

  for (const [appointmentId, tenantId, email, phone] of [
    ['seed-appt-8', serenity.id, 'ei.khaing@example.com', '+95 9 777 020 000'],
    ['seed-appt-11', lotus.id, 'cherry@customer.example', '+95 9 777 020 000'],
  ] as const) {
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
    });
    for (const [channel, recipient] of [
      ['EMAIL', email],
      ['SMS', phone],
    ] as const) {
      await prisma.notification.upsert({
        where: {
          appointmentId_channel_kind: {
            appointmentId,
            channel,
            kind: 'BOOKING_CONFIRMATION',
          },
        },
        update: { recipient, status: 'SENT', sentAt: new Date() },
        create: {
          id: `seed-notification-${appointmentId}-${channel}-confirmation`,
          tenantId,
          appointmentId,
          channel,
          kind: 'BOOKING_CONFIRMATION',
          recipient,
          status: 'SENT',
          scheduledFor: appointment.createdAt,
          sentAt: appointment.createdAt,
        },
      });
      await prisma.notification.upsert({
        where: {
          appointmentId_channel_kind: {
            appointmentId,
            channel,
            kind: 'APPOINTMENT_REMINDER',
          },
        },
        update: {
          recipient,
          scheduledFor: new Date(appointment.startsAt.getTime() - 86_400_000),
          status: 'QUEUED',
        },
        create: {
          id: `seed-notification-${appointmentId}-${channel}-reminder`,
          tenantId,
          appointmentId,
          channel,
          kind: 'APPOINTMENT_REMINDER',
          recipient,
          status: 'QUEUED',
          scheduledFor: new Date(appointment.startsAt.getTime() - 86_400_000),
        },
      });
    }
  }

  await prisma.systemError.upsert({
    where: { id: 'seed-error-1' },
    update: {},
    create: {
      id: 'seed-error-1',
      tenantId: lotus.id,
      method: 'POST',
      path: '/api/tenants/lotus/notifications/dispatch',
      statusCode: 502,
      message: 'Notification provider timeout',
      status: 'RESOLVED',
      occurredAt: utcDay(-3, 2),
      resolvedAt: utcDay(-3, 3),
    },
  });
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {
      platformName: 'Serenity Cloud',
      supportEmail: 'support@serenity.example',
      trialDays: 14,
      tenantApproval: true,
    },
    create: {
      id: 1,
      platformName: 'Serenity Cloud',
      supportEmail: 'support@serenity.example',
      trialDays: 14,
      tenantApproval: true,
    },
  });

  const users = [
    [
      'admin@serenity.cloud',
      'Platform Administrator',
      UserRole.PLATFORM_ADMIN,
      null,
      null,
    ],
    [
      'owner@serenity.com',
      'Nandar Aye',
      UserRole.TENANT_ADMIN,
      serenity.id,
      null,
    ],
    ['owner@lotus.example', 'Nilar Win', UserRole.TENANT_ADMIN, lotus.id, null],
    [
      'owner@aurora.example',
      'Khin Thiri',
      UserRole.TENANT_ADMIN,
      aurora.id,
      null,
    ],
    [
      'owner@orchid.example',
      'Moe Sandi',
      UserRole.TENANT_ADMIN,
      orchid.id,
      null,
    ],
  ] as const;
  for (const [email, name, role, tenantId, customerId] of users)
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name, role, tenantId, customerId },
      create: { email, passwordHash, name, role, tenantId, customerId },
    });
  for (const [tenantId, name, email] of customerRows) {
    const customerId = customers.get(`${tenantId}:${email}`)!;
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, name, role: UserRole.CUSTOMER, customerId },
      create: {
        email,
        passwordHash,
        name,
        role: UserRole.CUSTOMER,
        customerId,
      },
    });
  }

  console.log(`Seed complete. Password for seeded users: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
