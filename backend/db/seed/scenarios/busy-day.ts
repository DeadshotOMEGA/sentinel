/**
 * Busy Day Scenario
 * Generates high-traffic test data with 80+ check-ins, visitors, and an active event.
 */

import type { SeedScenarioConfig, SeedResult } from '@shared/types/dev-mode';
import { prisma } from '../../../src/db/prisma';

/**
 * Generate a random time between two hours (in 24-hour format)
 */
function randomTimeBetween(startHour: number, endHour: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startMs = startHour * 60 * 60 * 1000;
  const endMs = endHour * 60 * 60 * 1000;
  const randomMs = startMs + Math.random() * (endMs - startMs);

  return new Date(today.getTime() + randomMs);
}

/**
 * Distribute check-ins realistically throughout the day
 * - Morning rush: 0700-0900 (40% of check-ins)
 * - Mid-morning: 0900-1200 (20%)
 * - Lunch: 1200-1330 (15%)
 * - Afternoon: 1330-1700 (20%)
 * - Evening: 1700-2100 (5%)
 */
function getRealisticCheckInTime(): Date {
  const rand = Math.random();

  if (rand < 0.4) {
    return randomTimeBetween(7, 9); // Morning rush
  } else if (rand < 0.6) {
    return randomTimeBetween(9, 12); // Mid-morning
  } else if (rand < 0.75) {
    return randomTimeBetween(12, 13.5); // Lunch
  } else if (rand < 0.95) {
    return randomTimeBetween(13.5, 17); // Afternoon
  } else {
    return randomTimeBetween(17, 21); // Evening
  }
}

/**
 * Random element from array
 */
function randomElement<T>(arr: T[]): T {
  const element = arr[Math.floor(Math.random() * arr.length)];
  if (element === undefined) {
    throw new Error('Cannot select from empty array');
  }
  return element;
}

/**
 * Random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed(): Promise<SeedResult> {
  const startTime = Date.now();
  const createdCounts = {
    members: 0,
    checkins: 0,
    visitors: 0,
    events: 0,
  };

  // Get existing data
  const existingMembers = await prisma.member.findMany({
    where: { status: 'active' },
    select: { id: true, badgeId: true },
  });

  const existingDivisions = await prisma.division.findMany({
    select: { id: true },
  });

  const existingBadges = await prisma.badge.findMany({
    where: { assignmentType: 'unassigned', status: 'active' },
    select: { id: true, serialNumber: true },
  });

  // Ensure we have at least 30 members
  if (existingMembers.length < 30) {
    const membersToCreate = 30 - existingMembers.length;

    if (existingDivisions.length === 0) {
      throw new Error(
        'No divisions exist. Run initial seed first to create divisions.'
      );
    }

    const ranks = ['AB', 'OS', 'LS', 'MS', 'PO2', 'PO1', 'CPO2', 'CPO1'];
    const firstNames = [
      'Alex',
      'Jordan',
      'Casey',
      'Morgan',
      'Taylor',
      'Quinn',
      'Riley',
      'Avery',
      'Parker',
      'Devon',
      'Blake',
      'Cameron',
      'Jamie',
      'Skyler',
      'Reese',
    ];
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Martinez',
      'Anderson',
      'Taylor',
      'Thomas',
      'Moore',
      'Jackson',
      'Martin',
    ];

    for (let i = 0; i < membersToCreate; i++) {
      const serviceNumber = `V2${String(Date.now()).slice(-5)}${String(i).padStart(2, '0')}`;
      const division = randomElement(existingDivisions);

      const member = await prisma.member.create({
        data: {
          serviceNumber,
          rank: randomElement(ranks),
          firstName: randomElement(firstNames),
          lastName: randomElement(lastNames),
          divisionId: division.id,
          memberType: Math.random() > 0.3 ? 'reserve' : 'full_time',
          status: 'active',
        },
        select: { id: true, badgeId: true },
      });

      existingMembers.push(member);
      createdCounts.members++;
    }
  }

  // Assign badges to members without badges
  const membersWithoutBadges = existingMembers.filter((m) => !m.badgeId);
  let availableBadges = [...existingBadges];

  for (const member of membersWithoutBadges) {
    if (availableBadges.length === 0) break;

    const badge = availableBadges.pop();
    if (!badge) break;

    await prisma.badge.update({
      where: { id: badge.id },
      data: {
        assignmentType: 'member',
        assignedToId: member.id,
      },
    });

    await prisma.member.update({
      where: { id: member.id },
      data: { badgeId: badge.id },
    });

    member.badgeId = badge.id;
  }

  // Get members with badges for check-ins
  const membersWithBadges = existingMembers.filter((m) => m.badgeId);

  // Generate 80+ check-ins with realistic time distribution
  const checkInCount = randomInt(80, 100);
  const kioskIds = ['kiosk-entrance', 'kiosk-rear', 'kiosk-training'];

  for (let i = 0; i < checkInCount; i++) {
    const member = randomElement(membersWithBadges);
    const timestamp = getRealisticCheckInTime();

    await prisma.checkin.create({
      data: {
        memberId: member.id,
        badgeId: member.badgeId,
        direction: 'in',
        timestamp,
        kioskId: randomElement(kioskIds),
        synced: true,
        method: 'badge',
      },
    });

    createdCounts.checkins++;

    // 60% chance of having a checkout 2-8 hours later
    if (Math.random() < 0.6) {
      const checkOutTime = new Date(
        timestamp.getTime() + randomInt(2, 8) * 60 * 60 * 1000
      );

      // Only create checkout if it's still today
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      if (checkOutTime <= endOfDay) {
        await prisma.checkin.create({
          data: {
            memberId: member.id,
            badgeId: member.badgeId,
            direction: 'out',
            timestamp: checkOutTime,
            kioskId: randomElement(kioskIds),
            synced: true,
            method: 'badge',
          },
        });
        createdCounts.checkins++;
      }
    }
  }

  // Create 5-10 visitors
  const visitorCount = randomInt(5, 10);
  const visitTypes = [
    'contractor',
    'recruitment',
    'event',
    'official',
    'museum',
    'other',
  ] as const;
  const organizations = [
    'CAF Recruiting',
    'CFMWS',
    'City of Winnipeg',
    'DND Contractor',
    'Navy League',
    'Local Media',
    'Cadet Corps',
  ];

  for (let i = 0; i < visitorCount; i++) {
    const checkInTime = getRealisticCheckInTime();
    const hostMember =
      Math.random() > 0.3 ? randomElement(membersWithBadges) : null;

    await prisma.visitor.create({
      data: {
        name: `Visitor ${i + 1} TestPerson`,
        organization: randomElement(organizations),
        visitType: randomElement([...visitTypes]),
        visitReason: 'Business meeting',
        hostMemberId: hostMember?.id ?? null,
        checkInTime,
        checkOutTime:
          Math.random() > 0.4
            ? new Date(checkInTime.getTime() + randomInt(1, 4) * 60 * 60 * 1000)
            : null,
        kioskId: 'kiosk-entrance',
        checkInMethod: 'kiosk',
      },
    });

    createdCounts.visitors++;
  }

  // Create an active event with attendees
  const today = new Date();
  const eventEndDate = new Date(today);
  eventEndDate.setDate(eventEndDate.getDate() + 7);

  const event = await prisma.event.create({
    data: {
      name: 'Annual Training Exercise',
      code: `ATE-${today.getFullYear()}-${String(Date.now()).slice(-4)}`,
      description: 'Multi-unit training exercise with external attendees',
      startDate: today,
      endDate: eventEndDate,
      status: 'active',
      autoExpireBadges: true,
      customRoles: ['observer', 'participant', 'coordinator', 'support'],
    },
  });

  createdCounts.events = 1;

  // Add 8-15 event attendees
  const attendeeCount = randomInt(8, 15);
  const externalOrgs = [
    'HMCS Donnacona',
    'HMCS Carleton',
    'HMCS York',
    'CAF HQ',
    'Navy League Winnipeg',
  ];
  const roles = ['observer', 'participant', 'coordinator', 'support'];

  // Get temporary badges for event attendees
  const tempBadges = await prisma.badge.findMany({
    where: {
      assignmentType: 'unassigned',
      status: 'active',
      serialNumber: { startsWith: 'NFC-TEMP' },
    },
    take: attendeeCount,
  });

  for (let i = 0; i < attendeeCount; i++) {
    const badge = tempBadges[i];

    await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        name: `External Attendee ${i + 1}`,
        rank: Math.random() > 0.3 ? randomElement(['Lt(N)', 'SLt', 'PO1', 'CPO2']) : null,
        organization: randomElement(externalOrgs),
        role: randomElement(roles),
        badgeId: badge?.id ?? null,
        badgeAssignedAt: badge ? new Date() : null,
        accessStart: today,
        accessEnd: eventEndDate,
        status: badge ? 'checked_in' : 'pending',
      },
    });
  }

  const duration = Date.now() - startTime;

  return {
    scenario: 'busy-day',
    created: createdCounts,
    duration,
  };
}

export const busyDayScenario: SeedScenarioConfig = {
  id: 'busy-day',
  name: 'Busy Day',
  description:
    'High-traffic scenario with 80+ check-ins, 5-10 visitors, and an active event with attendees. Uses realistic time distribution (morning rush, lunch, afternoon).',
  seed,
};
