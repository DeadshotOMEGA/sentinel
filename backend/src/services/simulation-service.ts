import { prisma } from '../db/prisma';
import { getScheduleResolver, ScheduleResolver } from './schedule-resolver';
import type {
  SimulationRequest,
  SimulationResponse,
  SimulationPrecheck,
  SimulationAttendanceRates,
  SimulationIntensity,
  SimulationMemberCategory,
  CategorizedMember,
  ResolvedSchedule,
  DEFAULT_ATTENDANCE_RATES,
  DEFAULT_INTENSITY,
} from '@shared/types';

// Re-export defaults for use in API
export { DEFAULT_ATTENDANCE_RATES, DEFAULT_INTENSITY } from '@shared/types';

/**
 * Random utility functions
 */
const random = {
  /** Random boolean with given probability (0-100) */
  chance(percentage: number): boolean {
    return Math.random() * 100 < percentage;
  },

  /** Random integer between min and max (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** Random float between min and max */
  float(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  },

  /** Pick random item from array */
  pick<T>(arr: T[]): T {
    const item = arr[Math.floor(Math.random() * arr.length)];
    if (item === undefined) {
      throw new Error('Cannot pick from empty array');
    }
    return item;
  },

  /** Pick N random items from array */
  pickN<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  },
};

/**
 * Time manipulation utilities
 */
const timeUtils = {
  /** Parse HH:MM to minutes since midnight */
  parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours ?? 0) * 60 + (minutes ?? 0);
  },

  /** Format minutes since midnight to HH:MM */
  formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  },

  /** Create Date from date string and HH:MM time */
  createDateTime(dateStr: string, time: string): Date {
    return new Date(`${dateStr}T${time}:00`);
  },

  /** Add random variance to time (in minutes) */
  addVariance(time: string, minMinutes: number, maxMinutes: number): string {
    const minutes = this.parseTime(time);
    const variance = random.int(minMinutes, maxMinutes);
    return this.formatTime(minutes + variance);
  },
};

/**
 * Visitor name generator
 */
const visitorNames = {
  firstNames: [
    'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew',
    'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley',
  ],
  lastNames: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  ],
  organizations: [
    'Department of National Defence', 'Veterans Affairs Canada', 'Canadian Forces',
    'Navy League of Canada', 'Royal Canadian Legion', 'Sea Cadets', 'Local Business',
    'City of Winnipeg', 'Province of Manitoba', 'Media', 'Contractor Services',
    'IT Solutions Inc.', 'Security Services Ltd.', 'Catering Co.', 'Event Planning',
  ],
  generate(): { name: string; organization: string } {
    const firstName = random.pick(this.firstNames);
    const lastName = random.pick(this.lastNames);
    return {
      name: `${firstName} ${lastName}`,
      organization: random.pick(this.organizations),
    };
  },
};

/**
 * Event name generator
 */
const eventNames = {
  prefixes: ['Annual', 'Monthly', 'Quarterly', 'Special', 'Unit', 'Division'],
  types: [
    'Mess Dinner', 'Awards Ceremony', 'Training Exercise', 'Open House',
    'Remembrance Service', 'Change of Command', 'Inspection', 'Drill Competition',
    'Career Fair', 'Recruiting Event', 'Community Outreach', 'VIP Visit',
  ],
  generate(): string {
    return `${random.pick(this.prefixes)} ${random.pick(this.types)}`;
  },
  generateCode(): string {
    const year = new Date().getFullYear();
    const num = random.int(100, 999);
    return `EVT-${year}-${num}`;
  },
};

/**
 * Simulation Service
 *
 * Generates realistic historical data for testing purposes.
 */
export class SimulationService {
  private resolver: ScheduleResolver | null = null;
  private bmqDivisionId: string | null = null;
  private categorizedMembers: CategorizedMember[] = [];

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.resolver = await getScheduleResolver();

    // Find BMQ division
    const bmqDivision = await prisma.division.findFirst({
      where: { code: 'BMQ' },
    });
    this.bmqDivisionId = bmqDivision?.id ?? null;

    // Load and categorize all active members
    await this.loadMembers();
  }

  /**
   * Load and categorize all active members
   */
  private async loadMembers(): Promise<void> {
    const members = await prisma.member.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        serviceNumber: true,
        firstName: true,
        lastName: true,
        rank: true,
        divisionId: true,
        badgeId: true,
        memberType: true,
        notes: true,
        classDetails: true,
      },
    });

    this.categorizedMembers = members.map((member) => ({
      id: member.id,
      serviceNumber: member.serviceNumber,
      firstName: member.firstName,
      lastName: member.lastName,
      rank: member.rank,
      divisionId: member.divisionId ?? '',
      badgeId: member.badgeId,
      memberType: member.memberType,
      category: this.categorizeMember(
        member.memberType,
        member.divisionId,
        member.notes,
        member.classDetails
      ),
    }));
  }

  /**
   * Categorize a member based on their attributes
   */
  private categorizeMember(
    memberType: string,
    divisionId: string | null,
    notes: string | null,
    classDetails: string | null
  ): SimulationMemberCategory {
    const notesUpper = notes?.toUpperCase() ?? '';
    const classDetailsUpper = classDetails?.toUpperCase() ?? '';

    const isCHW = notesUpper.includes('CHW');
    const isEDT = classDetailsUpper.includes('ED&T');
    const isBMQDivision = divisionId === this.bmqDivisionId;

    // BMQ students (highest priority)
    if (isBMQDivision) {
      return 'bmq_student';
    }

    // FTS with CHW
    if (['class_b', 'reg_force'].includes(memberType) && isCHW) {
      return isEDT ? 'fts_edt' : 'fts';
    }

    // Everyone else is reserve-style
    return isEDT ? 'reserve_edt' : 'reserve';
  }

  /**
   * Get members by category
   */
  getMembersByCategory(category: SimulationMemberCategory): CategorizedMember[] {
    return this.categorizedMembers.filter((m) => m.category === category);
  }

  /**
   * Get member category counts
   */
  getMemberCategoryCounts(): Record<SimulationMemberCategory, number> {
    const counts: Record<SimulationMemberCategory, number> = {
      fts: 0,
      fts_edt: 0,
      reserve: 0,
      reserve_edt: 0,
      bmq_student: 0,
    };

    for (const member of this.categorizedMembers) {
      counts[member.category]++;
    }

    return counts;
  }

  /**
   * Pre-check simulation parameters
   */
  async precheck(request: SimulationRequest): Promise<SimulationPrecheck> {
    const { startDate, endDate } = this.resolveDateRange(request.timeRange);

    // Check for existing data in the range
    const existingCheckins = await prisma.checkin.count({
      where: {
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(`${endDate}T23:59:59`),
        },
      },
    });

    const existingVisitors = await prisma.visitor.count({
      where: {
        checkInTime: {
          gte: new Date(startDate),
          lte: new Date(`${endDate}T23:59:59`),
        },
      },
    });

    const existingEvents = await prisma.event.count({
      where: {
        OR: [
          {
            startDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          {
            endDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
        ],
      },
    });

    const hasOverlap = existingCheckins > 0 || existingVisitors > 0 || existingEvents > 0;

    return {
      hasOverlap,
      existingCheckins,
      existingVisitors,
      existingEvents,
      dateRange: { start: startDate, end: endDate },
      activeMembers: this.categorizedMembers.length,
      memberCategories: this.getMemberCategoryCounts(),
    };
  }

  /**
   * Run the simulation
   */
  async simulate(request: SimulationRequest): Promise<SimulationResponse> {
    const { startDate, endDate } = this.resolveDateRange(request.timeRange);
    const { attendanceRates, intensity } = request;

    if (!this.resolver) {
      throw new Error('SimulationService not initialized');
    }

    // Get schedule for each day
    const schedules = this.resolver.resolveDateRange(
      new Date(startDate),
      new Date(endDate)
    );

    // Track generated counts
    const generated = {
      checkins: 0,
      visitors: 0,
      events: 0,
      eventAttendees: 0,
      eventCheckins: 0,
    };

    const edgeCases = {
      forgottenCheckouts: 0,
      lateArrivals: 0,
      earlyDepartures: 0,
      flaggedEntries: 0,
    };

    const warnings: string[] = [];

    // Check for overlap if requested
    if (request.warnOnOverlap) {
      const precheck = await this.precheck(request);
      if (precheck.hasOverlap) {
        warnings.push(
          `Existing data found in range: ${precheck.existingCheckins} check-ins, ` +
            `${precheck.existingVisitors} visitors, ${precheck.existingEvents} events`
        );
      }
    }

    // Generate check-ins for each day
    for (const schedule of schedules) {
      const dayResult = await this.simulateDay(
        schedule,
        attendanceRates,
        intensity
      );

      generated.checkins += dayResult.checkins;
      generated.visitors += dayResult.visitors;
      edgeCases.forgottenCheckouts += dayResult.forgottenCheckouts;
      edgeCases.lateArrivals += dayResult.lateArrivals;
      edgeCases.earlyDepartures += dayResult.earlyDepartures;
      edgeCases.flaggedEntries += dayResult.flaggedEntries;
    }

    // Generate events for the period
    const eventResult = await this.simulateEvents(
      startDate,
      endDate,
      intensity
    );
    generated.events = eventResult.events;
    generated.eventAttendees = eventResult.attendees;
    generated.eventCheckins = eventResult.checkins;

    // Count members by simplified categories for response
    const memberBreakdown = {
      fts: this.getMembersByCategory('fts').length +
           this.getMembersByCategory('fts_edt').length,
      reserve: this.getMembersByCategory('reserve').length +
               this.getMembersByCategory('reserve_edt').length,
      bmq: this.getMembersByCategory('bmq_student').length,
      edt: this.getMembersByCategory('fts_edt').length +
           this.getMembersByCategory('reserve_edt').length,
    };

    return {
      summary: {
        dateRange: { start: startDate, end: endDate },
        daysSimulated: schedules.length,
        generated,
        memberBreakdown,
        edgeCases,
      },
      warnings,
    };
  }

  /**
   * Resolve date range from request
   */
  private resolveDateRange(
    timeRange: SimulationRequest['timeRange']
  ): { startDate: string; endDate: string } {
    if (timeRange.mode === 'custom') {
      if (!timeRange.startDate || !timeRange.endDate) {
        throw new Error('Custom date range requires startDate and endDate');
      }
      return {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
      };
    }

    // Calculate last N days
    const days = timeRange.lastDays ?? 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      startDate: startDate.toISOString().split('T')[0] as string,
      endDate: endDate.toISOString().split('T')[0] as string,
    };
  }

  /**
   * Simulate a single day
   */
  private async simulateDay(
    schedule: ResolvedSchedule,
    rates: SimulationAttendanceRates,
    intensity: SimulationIntensity
  ): Promise<{
    checkins: number;
    visitors: number;
    forgottenCheckouts: number;
    lateArrivals: number;
    earlyDepartures: number;
    flaggedEntries: number;
  }> {
    let checkins = 0;
    let visitors = 0;
    let forgottenCheckouts = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    let flaggedEntries = 0;

    // Skip holidays
    if (schedule.isHoliday) {
      return { checkins, visitors, forgottenCheckouts, lateArrivals, earlyDepartures, flaggedEntries };
    }

    const checkinRecords: Array<{
      memberId: string;
      badgeId: string | null;
      direction: 'in' | 'out';
      timestamp: Date;
      kioskId: string;
      method: string;
      flaggedForReview: boolean;
      flagReason: string | null;
    }> = [];

    // FTS members - work days
    if (schedule.isWorkDay && schedule.workHours) {
      const ftsMembers = [
        ...this.getMembersByCategory('fts'),
        ...this.getMembersByCategory('fts_edt'),
      ];

      for (const member of ftsMembers) {
        if (!random.chance(rates.ftsWorkDays)) continue;

        const isEdgeCase = random.chance(intensity.edgeCasePercentage);
        const isLate = isEdgeCase && random.chance(50);
        const isEarlyLeave = isEdgeCase && !isLate && random.chance(50);
        const forgotCheckout = isEdgeCase && !isLate && !isEarlyLeave;

        // Check-in time (with possible lateness)
        let checkInTime = schedule.workHours.start;
        if (isLate) {
          checkInTime = timeUtils.addVariance(checkInTime, 15, 60);
          lateArrivals++;
        } else {
          checkInTime = timeUtils.addVariance(checkInTime, -10, 5);
        }

        // Check-out time (with possible early departure)
        let checkOutTime = schedule.workHours.end;
        if (isEarlyLeave) {
          checkOutTime = timeUtils.addVariance(checkOutTime, -90, -30);
          earlyDepartures++;
        } else {
          checkOutTime = timeUtils.addVariance(checkOutTime, -5, 15);
        }

        // Add check-in
        checkinRecords.push({
          memberId: member.id,
          badgeId: member.badgeId,
          direction: 'in',
          timestamp: timeUtils.createDateTime(schedule.date, checkInTime),
          kioskId: 'MAIN-ENTRANCE',
          method: 'badge',
          flaggedForReview: false,
          flagReason: null,
        });

        // Add check-out (unless forgotten)
        if (!forgotCheckout) {
          checkinRecords.push({
            memberId: member.id,
            badgeId: member.badgeId,
            direction: 'out',
            timestamp: timeUtils.createDateTime(schedule.date, checkOutTime),
            kioskId: 'MAIN-ENTRANCE',
            method: 'badge',
            flaggedForReview: false,
            flagReason: null,
          });
        } else {
          forgottenCheckouts++;
        }

        // Random lunch break or appointment (10% chance)
        if (random.chance(10) && !forgotCheckout) {
          const lunchOut = timeUtils.addVariance('12:00', -30, 30);
          const lunchIn = timeUtils.addVariance('13:00', -15, 30);

          checkinRecords.push({
            memberId: member.id,
            badgeId: member.badgeId,
            direction: 'out',
            timestamp: timeUtils.createDateTime(schedule.date, lunchOut),
            kioskId: 'MAIN-ENTRANCE',
            method: 'badge',
            flaggedForReview: false,
            flagReason: null,
          });

          checkinRecords.push({
            memberId: member.id,
            badgeId: member.badgeId,
            direction: 'in',
            timestamp: timeUtils.createDateTime(schedule.date, lunchIn),
            kioskId: 'MAIN-ENTRANCE',
            method: 'badge',
            flaggedForReview: false,
            flagReason: null,
          });
        }
      }
    }

    // FTS & Reserve members - training nights
    if (schedule.isTrainingNight && schedule.trainingNightHours) {
      const ftsMembers = this.getMembersByCategory('fts');
      const ftsEdtMembers = this.getMembersByCategory('fts_edt');
      const reserveMembers = this.getMembersByCategory('reserve');
      const reserveEdtMembers = this.getMembersByCategory('reserve_edt');

      // FTS at training night
      for (const member of ftsMembers) {
        if (!random.chance(rates.ftsTrainingNight)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.trainingNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }

      // FTS ED&T at training night (rare)
      for (const member of ftsEdtMembers) {
        if (!random.chance(rates.edtAppearance)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.trainingNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }

      // Reserve at training night
      for (const member of reserveMembers) {
        if (!random.chance(rates.reserveTrainingNight)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.trainingNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }

      // Reserve ED&T at training night (rare)
      for (const member of reserveEdtMembers) {
        if (!random.chance(rates.edtAppearance)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.trainingNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }
    }

    // FTS & Reserve members - admin nights
    if (schedule.isAdminNight && schedule.adminNightHours) {
      const ftsMembers = this.getMembersByCategory('fts');
      const reserveMembers = this.getMembersByCategory('reserve');

      // FTS at admin night
      for (const member of ftsMembers) {
        if (!random.chance(rates.ftsAdminNight)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.adminNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }

      // Reserve at admin night
      for (const member of reserveMembers) {
        if (!random.chance(rates.reserveAdminNight)) continue;
        const result = this.generateTrainingNightCheckin(
          member,
          schedule.date,
          schedule.adminNightHours,
          intensity.edgeCasePercentage
        );
        checkinRecords.push(...result.records);
        if (result.isLate) lateArrivals++;
        if (result.forgotCheckout) forgottenCheckouts++;
      }
    }

    // BMQ students - BMQ training days
    if (schedule.isBmqTrainingDay && schedule.bmqHours) {
      const bmqMembers = this.getMembersByCategory('bmq_student');

      for (const member of bmqMembers) {
        if (!random.chance(rates.bmqAttendance)) continue;

        const isEdgeCase = random.chance(intensity.edgeCasePercentage);
        const isLate = isEdgeCase && random.chance(30);
        const forgotCheckout = isEdgeCase && !isLate && random.chance(30);

        // BMQ students are more punctual
        let checkInTime = schedule.bmqHours.start;
        if (isLate) {
          checkInTime = timeUtils.addVariance(checkInTime, 5, 20);
          lateArrivals++;
        } else {
          checkInTime = timeUtils.addVariance(checkInTime, -15, 0);
        }

        let checkOutTime = schedule.bmqHours.end;
        checkOutTime = timeUtils.addVariance(checkOutTime, -5, 10);

        checkinRecords.push({
          memberId: member.id,
          badgeId: member.badgeId,
          direction: 'in',
          timestamp: timeUtils.createDateTime(schedule.date, checkInTime),
          kioskId: 'MAIN-ENTRANCE',
          method: 'badge',
          flaggedForReview: false,
          flagReason: null,
        });

        if (!forgotCheckout) {
          checkinRecords.push({
            memberId: member.id,
            badgeId: member.badgeId,
            direction: 'out',
            timestamp: timeUtils.createDateTime(schedule.date, checkOutTime),
            kioskId: 'MAIN-ENTRANCE',
            method: 'badge',
            flaggedForReview: false,
            flagReason: null,
          });
        } else {
          forgottenCheckouts++;
        }
      }
    }

    // Add random flagged entries
    const numToFlag = Math.floor(checkinRecords.length * intensity.edgeCasePercentage / 100 * 0.1);
    const recordsToFlag = random.pickN(checkinRecords, numToFlag);
    for (const record of recordsToFlag) {
      record.flaggedForReview = true;
      record.flagReason = random.pick([
        'Unusual time',
        'Manual review required',
        'Badge read error - manually verified',
      ]);
      flaggedEntries++;
    }

    // Insert check-ins in batches
    if (checkinRecords.length > 0) {
      await prisma.checkin.createMany({
        data: checkinRecords.map((r) => ({
          memberId: r.memberId,
          badgeId: r.badgeId,
          direction: r.direction,
          timestamp: r.timestamp,
          kioskId: r.kioskId,
          method: r.method,
          flagged_for_review: r.flaggedForReview,
          flag_reason: r.flagReason,
          synced: true,
        })),
      });
      checkins = checkinRecords.length;
    }

    // Generate visitors
    if (schedule.isWorkDay || schedule.isTrainingNight || schedule.isAdminNight) {
      const numVisitors = random.int(intensity.visitorsPerDay.min, intensity.visitorsPerDay.max);
      const visitorRecords = await this.generateVisitors(schedule, numVisitors, intensity.edgeCasePercentage);

      if (visitorRecords.length > 0) {
        await prisma.visitor.createMany({
          data: visitorRecords,
        });
        visitors = visitorRecords.length;
        forgottenCheckouts += visitorRecords.filter((v) => v.checkOutTime === null).length;
      }
    }

    return {
      checkins,
      visitors,
      forgottenCheckouts,
      lateArrivals,
      earlyDepartures,
      flaggedEntries,
    };
  }

  /**
   * Generate check-in/out for training night attendance
   */
  private generateTrainingNightCheckin(
    member: CategorizedMember,
    date: string,
    hours: { start: string; end: string },
    edgeCasePercentage: number
  ): {
    records: Array<{
      memberId: string;
      badgeId: string | null;
      direction: 'in' | 'out';
      timestamp: Date;
      kioskId: string;
      method: string;
      flaggedForReview: boolean;
      flagReason: string | null;
    }>;
    isLate: boolean;
    forgotCheckout: boolean;
  } {
    const records: Array<{
      memberId: string;
      badgeId: string | null;
      direction: 'in' | 'out';
      timestamp: Date;
      kioskId: string;
      method: string;
      flaggedForReview: boolean;
      flagReason: string | null;
    }> = [];

    const isEdgeCase = random.chance(edgeCasePercentage);
    const isLate = isEdgeCase && random.chance(40);
    const forgotCheckout = isEdgeCase && !isLate && random.chance(30);

    // Check-in time
    let checkInTime = hours.start;
    if (isLate) {
      checkInTime = timeUtils.addVariance(checkInTime, 10, 45);
    } else {
      checkInTime = timeUtils.addVariance(checkInTime, -15, 10);
    }

    // Check-out time
    let checkOutTime = hours.end;
    checkOutTime = timeUtils.addVariance(checkOutTime, -10, 15);

    records.push({
      memberId: member.id,
      badgeId: member.badgeId,
      direction: 'in',
      timestamp: timeUtils.createDateTime(date, checkInTime),
      kioskId: 'MAIN-ENTRANCE',
      method: 'badge',
      flaggedForReview: false,
      flagReason: null,
    });

    if (!forgotCheckout) {
      records.push({
        memberId: member.id,
        badgeId: member.badgeId,
        direction: 'out',
        timestamp: timeUtils.createDateTime(date, checkOutTime),
        kioskId: 'MAIN-ENTRANCE',
        method: 'badge',
        flaggedForReview: false,
        flagReason: null,
      });
    }

    return { records, isLate, forgotCheckout };
  }

  /**
   * Generate visitor records for a day
   */
  private async generateVisitors(
    schedule: ResolvedSchedule,
    count: number,
    edgeCasePercentage: number
  ): Promise<Array<{
    name: string;
    organization: string;
    visitType: string;
    visitReason: string;
    hostMemberId: string | null;
    checkInTime: Date;
    checkOutTime: Date | null;
    kioskId: string;
    checkInMethod: string;
  }>> {
    const visitors: Array<{
      name: string;
      organization: string;
      visitType: string;
      visitReason: string;
      hostMemberId: string | null;
      checkInTime: Date;
      checkOutTime: Date | null;
      kioskId: string;
      checkInMethod: string;
    }> = [];

    // Get potential hosts (FTS members)
    const potentialHosts = this.getMembersByCategory('fts');

    // Determine time window based on schedule
    let startTime = '08:00';
    let endTime = '16:00';

    if (schedule.isTrainingNight && schedule.trainingNightHours) {
      startTime = schedule.trainingNightHours.start;
      endTime = schedule.trainingNightHours.end;
    } else if (schedule.isAdminNight && schedule.adminNightHours) {
      startTime = schedule.adminNightHours.start;
      endTime = schedule.adminNightHours.end;
    } else if (schedule.workHours) {
      startTime = schedule.workHours.start;
      endTime = schedule.workHours.end;
    }

    const visitTypes = ['contractor', 'recruitment', 'official', 'other', 'general'] as const;
    const visitReasons = [
      'Scheduled meeting',
      'Facility tour',
      'Contractor work',
      'Recruitment interview',
      'Document pickup',
      'VIP visit',
      'Vendor presentation',
      'Maintenance',
    ];

    for (let i = 0; i < count; i++) {
      const { name, organization } = visitorNames.generate();
      const visitType = random.pick([...visitTypes]);
      const visitReason = random.pick(visitReasons);

      // Random check-in time within window
      const startMinutes = timeUtils.parseTime(startTime);
      const endMinutes = timeUtils.parseTime(endTime);
      const checkInMinutes = random.int(startMinutes, endMinutes - 60);
      const checkInTime = timeUtils.formatTime(checkInMinutes);

      // Duration: 30 minutes to 4 hours
      const durationMinutes = random.int(30, 240);
      const checkOutMinutes = Math.min(checkInMinutes + durationMinutes, endMinutes + 30);
      const checkOutTime = timeUtils.formatTime(checkOutMinutes);

      // 20% chance of forgotten checkout (edge case)
      const forgotCheckout = random.chance(edgeCasePercentage * 2);

      // Assign a host (80% of visitors have a host)
      const host = random.chance(80) && potentialHosts.length > 0
        ? random.pick(potentialHosts)
        : null;

      visitors.push({
        name,
        organization,
        visitType,
        visitReason,
        hostMemberId: host?.id ?? null,
        checkInTime: timeUtils.createDateTime(schedule.date, checkInTime),
        checkOutTime: forgotCheckout ? null : timeUtils.createDateTime(schedule.date, checkOutTime),
        kioskId: 'MAIN-ENTRANCE',
        checkInMethod: 'kiosk',
      });
    }

    return visitors;
  }

  /**
   * Generate events for the simulation period
   */
  private async simulateEvents(
    startDate: string,
    endDate: string,
    intensity: SimulationIntensity
  ): Promise<{ events: number; attendees: number; checkins: number }> {
    // Calculate number of months in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000)));

    const numEvents = random.int(
      intensity.eventsPerMonth.min * months,
      intensity.eventsPerMonth.max * months
    );

    let totalAttendees = 0;
    let totalCheckins = 0;

    for (let i = 0; i < numEvents; i++) {
      // Random event date within range
      const daysInRange = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const eventStartOffset = random.int(0, Math.max(0, daysInRange - 3));
      const eventStart = new Date(start);
      eventStart.setDate(eventStart.getDate() + eventStartOffset);

      // Event duration: 1-3 days
      const eventDuration = random.int(1, 3);
      const eventEnd = new Date(eventStart);
      eventEnd.setDate(eventEnd.getDate() + eventDuration - 1);

      // Create event
      const eventName = eventNames.generate();
      const eventCode = eventNames.generateCode();

      const event = await prisma.event.create({
        data: {
          name: eventName,
          code: `${eventCode}-${i}`,
          description: `Simulated event: ${eventName}`,
          startDate: eventStart,
          endDate: eventEnd,
          status: 'completed',
          autoExpireBadges: true,
        },
      });

      // Generate 10-50 attendees
      const numAttendees = random.int(10, 50);
      const attendeeRecords: Array<{
        eventId: string;
        name: string;
        rank: string | null;
        organization: string;
        role: string;
        status: string;
        accessStart: Date;
        accessEnd: Date;
      }> = [];

      const roles = ['Guest', 'VIP', 'Participant', 'Observer', 'Speaker', 'Organizer'];
      const ranks = [null, 'Cdr', 'LCdr', 'Lt(N)', 'SLt', 'CPO1', 'CPO2', 'PO1', 'PO2', 'MS', 'LS', 'AB'];

      for (let j = 0; j < numAttendees; j++) {
        const { name, organization } = visitorNames.generate();
        attendeeRecords.push({
          eventId: event.id,
          name,
          rank: random.chance(30) ? random.pick(ranks) : null,
          organization,
          role: random.pick(roles),
          status: 'active',
          accessStart: eventStart,
          accessEnd: eventEnd,
        });
      }

      await prisma.eventAttendee.createMany({
        data: attendeeRecords,
      });

      totalAttendees += numAttendees;

      // Generate check-ins for each day of the event
      const attendees = await prisma.eventAttendee.findMany({
        where: { eventId: event.id },
      });

      // Get unassigned badges for event
      const unassignedBadges = await prisma.badge.findMany({
        where: {
          assignmentType: 'unassigned',
          status: 'active',
        },
        take: Math.min(attendees.length, 25),
      });

      const eventCheckins: Array<{
        eventAttendeeId: string;
        badgeId: string;
        direction: string;
        timestamp: Date;
        kioskId: string;
      }> = [];

      let currentDate = new Date(eventStart);
      while (currentDate <= eventEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (!dateStr) continue;

        // 70% of attendees show up each day
        const dailyAttendees = random.pickN(attendees, Math.floor(attendees.length * 0.7));

        for (let k = 0; k < dailyAttendees.length; k++) {
          const attendee = dailyAttendees[k];
          if (!attendee) continue;
          const badge = unassignedBadges[k % unassignedBadges.length];
          if (!badge) continue;

          const checkInTime = timeUtils.addVariance('09:00', -30, 60);
          const checkOutTime = timeUtils.addVariance('17:00', -60, 30);

          eventCheckins.push({
            eventAttendeeId: attendee.id,
            badgeId: badge.id,
            direction: 'in',
            timestamp: timeUtils.createDateTime(dateStr, checkInTime),
            kioskId: 'MAIN-ENTRANCE',
          });

          // 90% check out
          if (random.chance(90)) {
            eventCheckins.push({
              eventAttendeeId: attendee.id,
              badgeId: badge.id,
              direction: 'out',
              timestamp: timeUtils.createDateTime(dateStr, checkOutTime),
              kioskId: 'MAIN-ENTRANCE',
            });
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (eventCheckins.length > 0) {
        await prisma.eventCheckin.createMany({
          data: eventCheckins,
        });
        totalCheckins += eventCheckins.length;
      }
    }

    return {
      events: numEvents,
      attendees: totalAttendees,
      checkins: totalCheckins,
    };
  }
}

/**
 * Get or create simulation service instance
 */
let serviceInstance: SimulationService | null = null;

export async function getSimulationService(): Promise<SimulationService> {
  if (!serviceInstance) {
    serviceInstance = new SimulationService();
    await serviceInstance.initialize();
  }
  return serviceInstance;
}

/**
 * Reset service instance (for testing)
 */
export function resetSimulationService(): void {
  serviceInstance = null;
}
