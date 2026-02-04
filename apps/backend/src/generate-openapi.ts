import { generateOpenApi } from '@ts-rest/open-api'
import { writeFileSync } from 'fs'
import { join } from 'path'
import {
  memberContract,
  checkinContract,
  divisionContract,
  badgeContract,
  eventContract,
  visitorContract,
  securityAlertContract,
  ddsContract,
  lockupContract,
  visitTypesContract,
  memberStatusesContract,
  memberTypesContract,
  badgeStatusesContract,
  settingContract,
  adminUserContract,
  listContract,
  trainingYearContract,
  bmqCourseContract,
  reportSettingContract,
  alertConfigContract,
  reportContract,
  devToolsContract,
  devContract,
} from '@sentinel/contracts'
import { initContract } from '@ts-rest/core'

// Combine all contracts into a single API contract
const c = initContract()

const apiContract = c.router({
  members: memberContract,
  checkins: checkinContract,
  divisions: divisionContract,
  badges: badgeContract,
  events: eventContract,
  visitors: visitorContract,
  securityAlerts: securityAlertContract,
  dds: ddsContract,
  lockup: lockupContract,
  visitTypes: visitTypesContract,
  memberStatuses: memberStatusesContract,
  memberTypes: memberTypesContract,
  badgeStatuses: badgeStatusesContract,
  settings: settingContract,
  adminUsers: adminUserContract,
  lists: listContract,
  trainingYears: trainingYearContract,
  bmqCourses: bmqCourseContract,
  reportSettings: reportSettingContract,
  alertConfigs: alertConfigContract,
  reports: reportContract,
  devTools: devToolsContract,
  dev: devContract,
})

// Generate OpenAPI specification
const openApiDocument = generateOpenApi(
  apiContract,
  {
    info: {
      title: 'Sentinel API',
      version: '2.0.0',
      description:
        'RFID-based attendance tracking system for HMCS Chippawa naval reserve unit. ' +
        'Provides comprehensive APIs for member management, badge assignment, attendance tracking, ' +
        'visitor management, security alerts, reporting, and administrative operations.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.sentinel.example.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'members', description: 'Member management operations' },
      { name: 'checkins', description: 'Check-in and attendance tracking' },
      { name: 'divisions', description: 'Division management' },
      { name: 'badges', description: 'Badge assignment and tracking' },
      { name: 'events', description: 'Event and attendee management' },
      { name: 'visitors', description: 'Visitor sign-in and tracking' },
      { name: 'tags', description: 'Responsibility tag management' },
      { name: 'security-alerts', description: 'Security alert system' },
      { name: 'dds', description: 'Duty Day Staff management' },
      { name: 'lockup', description: 'Building lockup operations' },
      { name: 'visit-types', description: 'Visit type enumeration and lookup' },
      {
        name: 'member-statuses',
        description: 'Member status enumeration (Active, Inactive, etc.)',
      },
      { name: 'member-types', description: 'Member type enumeration (NCM, Officer, etc.)' },
      {
        name: 'badge-statuses',
        description: 'Badge status enumeration (Assigned, Disabled, etc.)',
      },
      { name: 'settings', description: 'System configuration and settings management' },
      { name: 'admin-users', description: 'Administrative user and role management' },
      { name: 'lists', description: 'Consolidated list endpoints for dropdowns and references' },
      { name: 'training-years', description: 'Training year configuration and periods' },
      { name: 'bmq-courses', description: 'Basic Military Qualification course management' },
      { name: 'report-settings', description: 'Report configuration and parameters' },
      { name: 'alert-configs', description: 'Security alert rule configuration' },
      { name: 'reports', description: 'Report generation and data export' },
      {
        name: 'dev-tools',
        description: 'Development utilities (database reset, simulation, scenarios)',
      },
      { name: 'dev', description: 'Development endpoints for testing and debugging' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  },
  {
    setOperationId: false,
    operationMapper: (operation, appRoute, _id) => ({
      ...operation,
      tags: [appRoute.path.split('/')[2]].filter((tag): tag is string => tag !== undefined), // Extract tag from /api/{resource}/*
    }),
  }
)

// Write to file
const outputPath = join(process.cwd(), 'openapi.json')
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf-8')

import { apiLogger } from './lib/logger.js'

apiLogger.info('OpenAPI documentation generated', { outputPath })
apiLogger.info('View with: npx swagger-ui-watcher openapi.json')
