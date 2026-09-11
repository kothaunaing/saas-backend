import {
  AppointmentStatus,
  PrismaClient,
  TenantStatus,
  UserRole,
} from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function upsertWorkDays(staffId: string) {
  for (let dayOfWeek = 0; dayOfWeek < days.length; dayOfWeek++) {
    await prisma.workDay.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
      update: {},
      create: { staffId, dayOfWeek, enabled: dayOfWeek !== 0, startTime: '09:00', endTime: '18:00' },
    });
  }
}

async function main() {
  const passwordHash = await hash('password123', 12);

  // Plans
  const starter = await prisma.plan.upsert({ where: { name: 'Starter' }, update: {}, create: { name: 'Starter', price: 19, tenantLimit: 1, staffLimit: 3, features: ['Appointments', 'Customer CRM', 'Basic reports'] } });
  const pro     = await prisma.plan.upsert({ where: { name: 'Pro' },     update: {}, create: { name: 'Pro',     price: 49, tenantLimit: 2, staffLimit: 10, features: ['Everything in Starter', 'Loyalty & rewards', 'Advanced analytics'] } });
  await              prisma.plan.upsert({ where: { name: 'Business' }, update: {}, create: { name: 'Business', price: 99, features: ['Everything in Pro', 'Multiple locations', 'Priority support'] } });

  // Serenity tenant
  const serenity = await prisma.tenant.upsert({
    where: { slug: 'serenity' },
    update: { planId: pro.id },
    create: {
      slug: 'serenity', name: 'Serenity Spa & Salon', ownerName: 'Nandar Aye',
      email: 'owner@serenity.com', phone: '+95 9 250 111 000',
      address: '42 Inya Road, Kamayut, Yangon', city: 'Yangon',
      tagline: 'Unhurried treatments in the middle of the city',
      description: 'A quiet six-room studio where every appointment gets its own room, its own playlist, and time to breathe.',
      amenities: ['Free parking', 'Herbal tea bar', 'Private rooms', 'Card & mobile payment'],
      currency: 'USD', timezone: 'Asia/Yangon', loyalty: true, pointsPerDollar: 4,
      status: TenantStatus.ACTIVE, planId: pro.id,
    },
  });

  // Lotus tenant
  const lotus = await prisma.tenant.upsert({
    where: { slug: 'lotus' },
    update: { planId: starter.id },
    create: {
      slug: 'lotus', name: 'Lotus Beauty Lounge', ownerName: 'Nilar Win',
      email: 'hello@lotus.example', phone: '+95 9 420 555 880',
      address: '18 University Avenue, Bahan, Yangon', city: 'Yangon',
      tagline: 'Colour specialists and a very good cup of coffee',
      amenities: ['Complimentary coffee', 'Free Wi-Fi', 'Card & mobile payment'],
      status: TenantStatus.TRIAL, planId: starter.id,
    },
  });

  // Lotus services
  const lotusSvcDefs: [string, string, number, number][] = [
    ['Signature Cut & Style', 'Hair', 60, 45],
    ['Balayage & Gloss', 'Hair', 150, 220],
    ['Gel Manicure', 'Nails', 45, 32],
  ];
  const lotusServices: Record<string, string> = {};
  for (const [name, category, duration, price] of lotusSvcDefs) {
    const s = await prisma.service.upsert({ where: { tenantId_name: { tenantId: lotus.id, name } }, update: {}, create: { tenantId: lotus.id, name, category, duration, price, description: `${name} at Lotus Beauty Lounge.` } });
    lotusServices[name] = s.id;
  }
  const lotusStaffDefs: [string, string, string[]][] = [
    ['Nilar Win', 'nilar@lotus.example', ['Signature Cut & Style', 'Balayage & Gloss']],
    ['Su Su Hlaing', 'su@lotus.example', ['Gel Manicure']],
  ];
  for (const [name, email, serviceNames] of lotusStaffDefs) {
    const m = await prisma.staff.upsert({ where: { tenantId_email: { tenantId: lotus.id, email } }, update: {}, create: { tenantId: lotus.id, name, email, role: name === 'Nilar Win' ? 'Owner' : 'Staff' } });
    for (const sn of serviceNames) { const sid = lotusServices[sn]; if (sid) await prisma.staffService.upsert({ where: { staffId_serviceId: { staffId: m.id, serviceId: sid } }, update: {}, create: { staffId: m.id, serviceId: sid } }); }
    await upsertWorkDays(m.id);
  }

  // Serenity services
  const sernSvcDefs: [string, string, number, number][] = [
    ['Hydrating Facial', 'Facial', 60, 55],
    ['Anti-Ageing Facial', 'Facial', 75, 85],
    ['Body Scrub & Wrap', 'Body', 90, 70],
    ['Signature Cut & Style', 'Hair', 60, 45],
    ['Aromatherapy Massage', 'Massage', 60, 65],
    ['Gel Manicure', 'Nails', 45, 32],
    ['Hair Color & Treatment', 'Hair', 120, 110],
  ];
  const sernServices: Record<string, string> = {};
  for (const [name, category, duration, price] of sernSvcDefs) {
    const s = await prisma.service.upsert({ where: { tenantId_name: { tenantId: serenity.id, name } }, update: {}, create: { tenantId: serenity.id, name, category, duration, price, description: `${name} tailored to you.` } });
    sernServices[name] = s.id;
  }

  // Serenity customers
  const custDefs: [string, string, string, number][] = [
    ['Ei Ei Khaing',   'ei.khaing@example.com',     '+95 9 250 111 222', 1240],
    ['Zin Mar Oo',     'zinmar.oo@example.com',      '+95 9 250 111 223',  860],
    ['Htet Htet Lin',  'htet.lin@example.com',       '+95 9 250 111 224',  180],
    ['Aung Kyaw Moe',  'aung.moe@example.com',       '+95 9 250 111 225',  320],
    ['Phyu Phyu Win',  'phyu.win@example.com',       '+95 9 250 111 226', 2100],
    ['Nilar Soe',      'nilar.soe@example.com',      '+95 9 250 111 227',   40],
    ['Thandar Kyaw',   'thandar.kyaw@example.com',   '+95 9 250 111 228',  640],
    ['Su Myat Noe',    'su.myat@example.com',        '+95 9 250 111 229',  420],
  ];
  const custIds: Record<string, string> = {};
  for (const [name, email, phone, points] of custDefs) {
    const c = await prisma.customer.upsert({
      where: { tenantId_email: { tenantId: serenity.id, email } },
      update: {},
      create: { tenantId: serenity.id, name, email, phone, points, notes: email === 'ei.khaing@example.com' ? 'Prefers Hnin Wai. Sensitive skin — patch test before any new product.' : undefined },
    });
    custIds[email] = c.id;
  }

  // Serenity staff
  const sernStaffDefs: [string, string, string, string[]][] = [
    ['Nandar Aye',  'owner@serenity.com',     'Owner',   ['Signature Cut & Style', 'Hair Color & Treatment', 'Gel Manicure']],
    ['Thiri Ko',    'manager@serenity.com',   'Manager', ['Hydrating Facial', 'Anti-Ageing Facial', 'Body Scrub & Wrap', 'Aromatherapy Massage']],
    ['May Zin',     'staff@serenity.com',     'Staff',   ['Signature Cut & Style', 'Gel Manicure', 'Hair Color & Treatment']],
    ['Su Latt',     'su.latt@serenity.com',   'Staff',   ['Body Scrub & Wrap', 'Aromatherapy Massage', 'Gel Manicure']],
    ['Hnin Wai',    'hnin.wai@serenity.com',  'Staff',   ['Hydrating Facial', 'Anti-Ageing Facial', 'Body Scrub & Wrap']],
    ['Aye Chan',    'aye.chan@serenity.com',   'Staff',   ['Gel Manicure']],
  ];
  const staffIds: Record<string, string> = {};
  for (const [name, email, role, serviceNames] of sernStaffDefs) {
    const m = await prisma.staff.upsert({ where: { tenantId_email: { tenantId: serenity.id, email } }, update: {}, create: { tenantId: serenity.id, name, email, role } });
    staffIds[email] = m.id;
    for (const sn of serviceNames) { const sid = sernServices[sn]; if (sid) await prisma.staffService.upsert({ where: { staffId_serviceId: { staffId: m.id, serviceId: sid } }, update: {}, create: { staffId: m.id, serviceId: sid } }); }
    await upsertWorkDays(m.id);
  }

  // Appointment (keep stable id for idempotency)
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-1' },
    update: {},
    create: {
      id: 'seed-appt-1',
      tenantId: serenity.id,
      customerId: custIds['ei.khaing@example.com'],
      serviceId: sernServices['Hydrating Facial'],
      staffId: staffIds['hnin.wai@serenity.com'],
      startsAt: new Date('2026-09-15T09:00:00Z'),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // Rewards
  for (const [name, points, description] of [
    ['$10 off your next visit', 500, 'A little thank you for coming back.'],
    ['Complimentary gel manicure', 1500, 'A finishing touch, on us.'],
    ['Signature facial experience', 2500, 'An hour of well-deserved self-care.'],
  ] as [string, number, string][]) {
    if (!(await prisma.reward.findFirst({ where: { tenantId: serenity.id, name } })))
      await prisma.reward.create({ data: { tenantId: serenity.id, name, points, description } });
  }

  // Platform settings
  await prisma.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, platformName: 'Serenity Cloud', supportEmail: 'support@serenity.example' } });

  // Users
  await prisma.user.upsert({
    where: { email: 'admin@serenity.cloud' },
    update: { passwordHash },
    create: { email: 'admin@serenity.cloud', passwordHash, name: 'Platform Admin', role: UserRole.PLATFORM_ADMIN },
  });
  await prisma.user.upsert({
    where: { email: 'owner@serenity.com' },
    update: { passwordHash, tenantId: serenity.id },
    create: { email: 'owner@serenity.com', passwordHash, name: 'Nandar Aye', role: UserRole.TENANT_ADMIN, tenantId: serenity.id },
  });

  // Customer users (every seeded customer can sign in with password123)
  // First clean up any legacy unlinked duplicate user
  await prisma.user.deleteMany({ where: { email: 'ei.khaing@gmail.com' } });

  for (const [name, email] of custDefs) {
    const customerId = custIds[email];
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, customerId, name, role: UserRole.CUSTOMER },
      create: { email, passwordHash, name, role: UserRole.CUSTOMER, customerId },
    });
  }

  console.log('✅ Seed complete');
}

main().finally(() => prisma.$disconnect());
