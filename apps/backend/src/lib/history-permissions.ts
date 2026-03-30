import type { Request } from 'express'
import { ScheduleService } from '../services/schedule-service.js'
import { AccountLevel } from '../middleware/roles.js'
import { getPrismaClient } from './database.js'
import { serviceLogger } from './logger.js'

const scheduleService = new ScheduleService(getPrismaClient())

export async function canMemberEditHistory(req: Request): Promise<boolean> {
  const member = req.member

  if (!member) {
    return false
  }

  if (member.accountLevel >= AccountLevel.ADMIN) {
    return true
  }

  try {
    const { dds } = await scheduleService.getCurrentDdsFromSchedule()
    return dds?.status !== 'released' && dds?.member.id === member.id
  } catch (error) {
    serviceLogger.warn('Failed to resolve current DDS for history permission check', {
      memberId: member.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}
