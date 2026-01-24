import { initContract } from '@ts-rest/core'
import { memberContract } from './member.contract.js'
import { checkinContract } from './checkin.contract.js'
import { divisionContract } from './division.contract.js'
import { badgeContract } from './badge.contract.js'
import { auditContract } from './audit.contract.js'
import { enumContract } from './enum.contract.js'
import { adminUserContract } from './admin-user.contract.js'
import { listContract } from './list.contract.js'
import { trainingYearContract } from './training-year.contract.js'
import { bmqCourseContract } from './bmq-course.contract.js'
import { reportSettingContract } from './report-setting.contract.js'
import { alertConfigContract } from './alert-config.contract.js'
import { reportContract } from './report.contract.js'
import { devToolsContract } from './dev-tools.contract.js'
import { devContract } from './dev.contract.js'
import { securityAlertContract } from './security-alert.contract.js'
import { ddsContract } from './dds.contract.js'

const c = initContract()

/**
 * Main API contract
 *
 * Combines all route contracts into a single API contract
 * for use with ts-rest client and server
 */
export const apiContract = c.router(
  {
    members: memberContract,
    checkins: checkinContract,
    divisions: divisionContract,
    badges: badgeContract,
    auditLogs: auditContract,
    enums: enumContract,
    adminUsers: adminUserContract,
    lists: listContract,
    trainingYears: trainingYearContract,
    bmqCourses: bmqCourseContract,
    reportSettings: reportSettingContract,
    alertConfigs: alertConfigContract,
    reports: reportContract,
    devTools: devToolsContract,
    dev: devContract,
    securityAlerts: securityAlertContract,
    dds: ddsContract,
  },
  {
    pathPrefix: '',
  }
)
