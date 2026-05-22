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
import { databaseExplorerContract } from './database-explorer.contract.js'
import { rankContract } from './rank.contract.js'
import { qualificationContract } from './qualification.contract.js'
import { scheduleContract } from './schedule.contract.js'
import { unitEventContract } from './unit-event.contract.js'
import { lockupContract } from './lockup.contract.js'
import { visitorContract } from './visitor.contract.js'
import { statHolidayContract } from './stat-holiday.contract.js'
import { tagContract } from './tag.contract.js'
import { settingContract } from './setting.contract.js'
import { operationalTimingContract } from './operational-timing.contract.js'
import { authContract } from './auth.contract.js'
import { remoteSystemContract } from './remote-system.contract.js'
import { networkSettingContract } from './network-setting.contract.js'
import { systemStatusContract } from './system-status.contract.js'
import { systemUpdateContract } from './system-update.contract.js'
import { adminNavigationContract } from './admin-navigation.contract.js'
import { temporaryPersonnelContract } from './temporary-personnel.contract.js'

const c = initContract()

export type ApiContract = {
  members: typeof memberContract
  checkins: typeof checkinContract
  divisions: typeof divisionContract
  badges: typeof badgeContract
  auditLogs: typeof auditContract
  enums: typeof enumContract
  adminUsers: typeof adminUserContract
  lists: typeof listContract
  trainingYears: typeof trainingYearContract
  bmqCourses: typeof bmqCourseContract
  reportSettings: typeof reportSettingContract
  alertConfigs: typeof alertConfigContract
  reports: typeof reportContract
  devTools: typeof devToolsContract
  dev: typeof devContract
  securityAlerts: typeof securityAlertContract
  dds: typeof ddsContract
  databaseExplorer: typeof databaseExplorerContract
  ranks: typeof rankContract
  qualifications: typeof qualificationContract
  schedules: typeof scheduleContract
  unitEvents: typeof unitEventContract
  lockup: typeof lockupContract
  visitors: typeof visitorContract
  statHolidays: typeof statHolidayContract
  tags: typeof tagContract
  settings: typeof settingContract
  operationalTimings: typeof operationalTimingContract
  auth: typeof authContract
  remoteSystems: typeof remoteSystemContract
  networkSettings: typeof networkSettingContract
  systemStatus: typeof systemStatusContract
  systemUpdate: typeof systemUpdateContract
  adminNavigation: typeof adminNavigationContract
  temporaryPersonnel: typeof temporaryPersonnelContract
}

/**
 * Main API contract
 *
 * Combines all route contracts into a single API contract
 * for use with ts-rest client and server
 */
export const apiContract: ApiContract = c.router(
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
    databaseExplorer: databaseExplorerContract,
    ranks: rankContract,
    qualifications: qualificationContract,
    schedules: scheduleContract,
    unitEvents: unitEventContract,
    lockup: lockupContract,
    visitors: visitorContract,
    statHolidays: statHolidayContract,
    tags: tagContract,
    settings: settingContract,
    operationalTimings: operationalTimingContract,
    auth: authContract,
    remoteSystems: remoteSystemContract,
    networkSettings: networkSettingContract,
    systemStatus: systemStatusContract,
    systemUpdate: systemUpdateContract,
    adminNavigation: adminNavigationContract,
    temporaryPersonnel: temporaryPersonnelContract,
  },
  {
    pathPrefix: '',
  }
)
