import type { PrismaClient } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { StatHolidayRepository, type StatHolidayEntity } from '../repositories/stat-holiday-repository.js'
import { NotFoundError, ConflictError } from '../middleware/error-handler.js'

/**
 * Service for managing statutory holidays and their impact on operations
 */
export class StatHolidayService {
  private prisma: PrismaClient
  private repo: StatHolidayRepository

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient()
    this.repo = new StatHolidayRepository(this.prisma)
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Get all stat holidays
   */
  async getAll(options?: {
    year?: number
    province?: string
    activeOnly?: boolean
  }): Promise<{ holidays: StatHolidayEntity[]; total: number }> {
    const [holidays, total] = await Promise.all([
      this.repo.findAll(options),
      this.repo.count(options),
    ])

    return { holidays, total }
  }

  /**
   * Get a stat holiday by ID
   */
  async getById(id: string): Promise<StatHolidayEntity> {
    const holiday = await this.repo.findById(id)
    if (!holiday) {
      throw new NotFoundError('StatHoliday', id)
    }
    return holiday
  }

  /**
   * Create a new stat holiday
   */
  async create(input: {
    date: string // YYYY-MM-DD
    name: string
    province?: string | null
    isActive?: boolean
  }): Promise<StatHolidayEntity> {
    const date = new Date(input.date + 'T00:00:00')

    // Check for duplicate date
    const existing = await this.repo.findByDate(date)
    if (existing) {
      throw new ConflictError(`A holiday already exists for ${input.date}`)
    }

    return this.repo.create({
      date,
      name: input.name,
      province: input.province,
      isActive: input.isActive,
    })
  }

  /**
   * Update a stat holiday
   */
  async update(
    id: string,
    input: {
      date?: string // YYYY-MM-DD
      name?: string
      province?: string | null
      isActive?: boolean
    }
  ): Promise<StatHolidayEntity> {
    // Verify exists
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new NotFoundError('StatHoliday', id)
    }

    // If changing date, check for duplicate
    if (input.date) {
      const newDate = new Date(input.date + 'T00:00:00')
      const duplicate = await this.repo.findByDate(newDate)
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`A holiday already exists for ${input.date}`)
      }
    }

    return this.repo.update(id, {
      date: input.date ? new Date(input.date + 'T00:00:00') : undefined,
      name: input.name,
      province: input.province,
      isActive: input.isActive,
    })
  }

  /**
   * Delete a stat holiday
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) {
      throw new NotFoundError('StatHoliday', id)
    }

    await this.repo.delete(id)
  }

  // ============================================================================
  // Holiday Logic
  // ============================================================================

  /**
   * Check if a date is a statutory holiday
   */
  async isHoliday(date: Date | string): Promise<{ isHoliday: boolean; holiday: StatHolidayEntity | null }> {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
    const holiday = await this.repo.findByDate(dateObj)

    if (holiday && holiday.isActive) {
      return { isHoliday: true, holiday }
    }

    return { isHoliday: false, holiday: null }
  }

  /**
   * Get the first operational day of a week (skipping holidays at the start)
   *
   * For DDS handover, the week starts Monday. If Monday is a holiday,
   * the first operational day is Tuesday. If Monday and Tuesday are holidays,
   * it's Wednesday, etc.
   *
   * @param weekStartDate - The Monday of the week
   * @returns The first non-holiday day of the week (may be Monday if not a holiday)
   */
  async getFirstOperationalDay(weekStartDate: Date): Promise<Date> {
    // Ensure we start with Monday at 00:00:00
    const monday = new Date(weekStartDate)
    monday.setHours(0, 0, 0, 0)

    // Get holidays for the week (Monday through Friday - we don't operate on weekends anyway)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const holidays = await this.repo.findInRange(monday, friday)
    const holidayDates = new Set(
      holidays.map((h) => h.date.toISOString().substring(0, 10))
    )

    // Find first non-holiday weekday
    const currentDay = new Date(monday)
    for (let i = 0; i < 5; i++) {
      // Monday through Friday
      const dateStr = currentDay.toISOString().substring(0, 10)
      if (!holidayDates.has(dateStr)) {
        return currentDay
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // If entire week is holidays (extremely unlikely), return Monday
    return monday
  }

  /**
   * Check if a date is the first operational day of its week
   *
   * This is used to determine if DDS handover should happen on this day.
   */
  async isFirstOperationalDayOfWeek(date: Date): Promise<boolean> {
    // Get the Monday of the week containing this date
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const dayOfWeek = d.getDay() // 0 = Sunday, 1 = Monday, ...
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    const firstOpDay = await this.getFirstOperationalDay(monday)
    const dateStr = d.toISOString().substring(0, 10)
    const firstOpStr = firstOpDay.toISOString().substring(0, 10)

    return dateStr === firstOpStr
  }

  /**
   * Get holidays for a specific year (useful for populating yearly holidays)
   */
  async getHolidaysForYear(year: number): Promise<StatHolidayEntity[]> {
    const { holidays } = await this.getAll({ year, activeOnly: true })
    return holidays
  }
}

export const statHolidayService = new StatHolidayService()
