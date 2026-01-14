/**
 * Empty Scenario
 * Clean slate - clears all checkins, visitors, events while preserving
 * members, badges, divisions, and admin users.
 */

import type { SeedScenarioConfig, SeedResult } from '@shared/types/dev-mode';
import { prisma } from '../../../src/db/prisma';

/**
 * Clear transient data while keeping base configuration
 */
async function seed(): Promise<SeedResult> {
  const startTime = Date.now();

  const deletedCounts = {
    checkins: 0,
    visitors: 0,
    events: 0,
    eventAttendees: 0,
    eventCheckins: 0,
  };

  await prisma.$transaction(async (tx) => {
    // Clear in dependency order (most dependent first)
    const eventCheckinsResult = await tx.eventCheckin.deleteMany({});
    deletedCounts.eventCheckins = eventCheckinsResult.count;

    const eventAttendeesResult = await tx.eventAttendee.deleteMany({});
    deletedCounts.eventAttendees = eventAttendeesResult.count;

    const eventsResult = await tx.event.deleteMany({});
    deletedCounts.events = eventsResult.count;

    const checkinsResult = await tx.checkin.deleteMany({});
    deletedCounts.checkins = checkinsResult.count;

    const visitorsResult = await tx.visitor.deleteMany({});
    deletedCounts.visitors = visitorsResult.count;
  });

  const duration = Date.now() - startTime;

  return {
    scenario: 'empty',
    created: {
      members: 0,
      checkins: -deletedCounts.checkins, // Negative to indicate deletion
      visitors: -deletedCounts.visitors,
      events: -deletedCounts.events,
    },
    duration,
  };
}

export const emptyScenario: SeedScenarioConfig = {
  id: 'empty',
  name: 'Clean Slate',
  description:
    'Clears all check-ins, visitors, and events. Preserves members, badges, divisions, and admin users.',
  seed,
};
