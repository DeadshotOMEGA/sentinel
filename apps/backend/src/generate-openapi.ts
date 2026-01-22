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
  tagContract,
  securityAlertContract,
  ddsContract,
  lockupContract,
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
  tags: tagContract,
  securityAlerts: securityAlertContract,
  dds: ddsContract,
  lockup: lockupContract,
})

// Generate OpenAPI specification
const openApiDocument = generateOpenApi(
  apiContract,
  {
    info: {
      title: 'Sentinel API',
      version: '1.0.0',
      description:
        'RFID-based attendance tracking system for HMCS Chippawa naval reserve unit',
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
      { name: 'dds', description: 'Daily Duty Staff management' },
      { name: 'lockup', description: 'Building lockup operations' },
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
    setOperationId: true,
    operationMapper: (operation, appRoute) => ({
      ...operation,
      tags: [appRoute.path.split('/')[2]], // Extract tag from /api/{resource}/*
    }),
  }
)

// Write to file
const outputPath = join(process.cwd(), 'openapi.json')
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2), 'utf-8')

console.log(`✅ OpenAPI documentation generated: ${outputPath}`)
console.log('📝 View with: npx swagger-ui-watcher openapi.json')
