/**
 * Edge Cases Scenario
 * Creates data designed to test edge case handling:
 * - Expired contracts
 * - Missing badge assignments
 * - Forgotten check-outs
 * - Very long names
 * - Very long organization names
 */

import type { SeedScenarioConfig, SeedResult } from '@shared/types/dev-mode';
import { prisma } from '../../../src/db/prisma';

async function seed(): Promise<SeedResult> {
  const startTime = Date.now();
  const createdCounts = {
    members: 0,
    checkins: 0,
    visitors: 0,
    events: 0,
  };

  // Get a division to assign members to
  const division = await prisma.division.findFirst();
  if (!division) {
    throw new Error('No divisions exist. Run initial seed first to create divisions.');
  }

  // Get an unassigned badge for members who should have one
  const availableBadges = await prisma.badge.findMany({
    where: { assignmentType: 'unassigned', status: 'active' },
    take: 3,
  });

  // 1. Member with expired contract date
  const expiredContractDate = new Date();
  expiredContractDate.setMonth(expiredContractDate.getMonth() - 3);

  const expiredMember = await prisma.member.create({
    data: {
      serviceNumber: `VX-EXP-${Date.now()}`,
      rank: 'LS',
      firstName: 'Expired',
      lastName: 'Contract',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active', // Still marked active despite expired contract
      contract_start: new Date('2022-01-01'),
      contract_end: expiredContractDate,
      badgeId: availableBadges[0]?.id ?? null,
    },
  });

  if (availableBadges[0]) {
    await prisma.badge.update({
      where: { id: availableBadges[0].id },
      data: { assignmentType: 'member', assignedToId: expiredMember.id },
    });
  }
  createdCounts.members++;

  // 2. Member with no badge assigned
  await prisma.member.create({
    data: {
      serviceNumber: `VX-NOBADGE-${Date.now()}`,
      rank: 'OS',
      firstName: 'Missing',
      lastName: 'Badge',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active',
      badgeId: null, // Explicitly no badge
    },
  });
  createdCounts.members++;

  // 3. Member with very long name (50+ characters each)
  const longFirstName = 'Alexandria-Maximilian-Christopher';
  const longLastName = 'Von-Schwarzenberg-Unterschwarzbach-Oberndorfer';

  const longNameMember = await prisma.member.create({
    data: {
      serviceNumber: `VX-LONG-${Date.now()}`,
      rank: 'PO2',
      firstName: longFirstName,
      lastName: longLastName,
      divisionId: division.id,
      memberType: 'full_time',
      status: 'active',
      badgeId: availableBadges[1]?.id ?? null,
    },
  });

  if (availableBadges[1]) {
    await prisma.badge.update({
      where: { id: availableBadges[1].id },
      data: { assignmentType: 'member', assignedToId: longNameMember.id },
    });
  }
  createdCounts.members++;

  // 4. Check-in without check-out (forgotten scan)
  // Find a member with a badge
  const memberWithBadge = await prisma.member.findFirst({
    where: {
      status: 'active',
      badgeId: { not: null },
    },
    select: { id: true, badgeId: true },
  });

  if (memberWithBadge?.badgeId) {
    // Create a check-in from 6 hours ago with no corresponding check-out
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    await prisma.checkin.create({
      data: {
        memberId: memberWithBadge.id,
        badgeId: memberWithBadge.badgeId,
        direction: 'in',
        timestamp: sixHoursAgo,
        kioskId: 'kiosk-entrance',
        synced: true,
        method: 'badge',
        flagged_for_review: true,
        flag_reason: 'No corresponding check-out after 6 hours',
      },
    });
    createdCounts.checkins++;
  }

  // 5. Visitor with very long organization name
  const longOrgName =
    'The International Association of Naval Reserve Personnel Training and Development Coordinators of North America and the Caribbean Region';

  await prisma.visitor.create({
    data: {
      name: 'Test Visitor LongOrg',
      organization: longOrgName,
      visitType: 'official',
      visitReason: 'Annual coordination meeting for multi-regional training initiatives',
      checkInTime: new Date(),
      checkOutTime: null, // Still on premises
      kioskId: 'kiosk-entrance',
      checkInMethod: 'admin',
      adminNotes: 'VIP visitor - long organization name for UI testing',
    },
  });
  createdCounts.visitors++;

  // 6. Visitor with no organization (null)
  await prisma.visitor.create({
    data: {
      name: 'Anonymous Visitor',
      organization: null,
      visitType: 'other',
      visitReason: 'Personal visit',
      checkInTime: new Date(),
      checkOutTime: null,
      kioskId: 'kiosk-entrance',
      checkInMethod: 'kiosk',
    },
  });
  createdCounts.visitors++;

  // 7. Member with special characters in name
  const specialCharMember = await prisma.member.create({
    data: {
      serviceNumber: `VX-SPEC-${Date.now()}`,
      rank: 'MS',
      firstName: "Jean-Pierre O'Connor",
      lastName: 'St. Marie-Claire',
      divisionId: division.id,
      memberType: 'reserve',
      status: 'active',
      badgeId: availableBadges[2]?.id ?? null,
    },
  });

  if (availableBadges[2]) {
    await prisma.badge.update({
      where: { id: availableBadges[2].id },
      data: { assignmentType: 'member', assignedToId: specialCharMember.id },
    });
  }
  createdCounts.members++;

  // 8. Old check-in from last week (for historical data testing)
  if (memberWithBadge?.badgeId) {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(9, 0, 0, 0);

    await prisma.checkin.create({
      data: {
        memberId: memberWithBadge.id,
        badgeId: memberWithBadge.badgeId,
        direction: 'in',
        timestamp: lastWeek,
        kioskId: 'kiosk-entrance',
        synced: true,
        method: 'badge',
      },
    });

    const lastWeekOut = new Date(lastWeek);
    lastWeekOut.setHours(17, 0, 0, 0);

    await prisma.checkin.create({
      data: {
        memberId: memberWithBadge.id,
        badgeId: memberWithBadge.badgeId,
        direction: 'out',
        timestamp: lastWeekOut,
        kioskId: 'kiosk-entrance',
        synced: true,
        method: 'badge',
      },
    });
    createdCounts.checkins += 2;
  }

  const duration = Date.now() - startTime;

  return {
    scenario: 'edge-cases',
    created: createdCounts,
    duration,
  };
}

export const edgeCasesScenario: SeedScenarioConfig = {
  id: 'edge-cases',
  name: 'Edge Cases',
  description:
    'Creates edge case data: expired contract member, member without badge, forgotten check-out, 50+ character names, very long organization names.',
  seed,
};
