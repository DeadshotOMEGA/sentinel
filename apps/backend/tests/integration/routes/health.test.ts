import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../../src/app.js'
import { TestDatabase } from '../../helpers/testcontainers.js'

/**
 * Health Routes Integration Tests
 *
 * Tests health check endpoints using real database via Testcontainers.
 * These tests verify that the database service injection is working correctly.
 *
 * If these tests pass, it means:
 * - getPrismaClient() is correctly returning the test client
 * - No "password authentication failed for user 'placeholder'" errors
 * - Routes can query the database successfully in tests
 */
describe('Health Routes Integration Tests', () => {
  const testDb = new TestDatabase()
  const app = createApp()

  beforeAll(async () => {
    await testDb.start() // Injects test client into database service
  }, 60000)

  afterAll(async () => {
    await testDb.stop() // Resets database service to default client
  })

  describe('GET /health', () => {
    it('should return 200 with healthy status and database check', async () => {
      const response = await request(app).get('/health').expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('checks')
      expect(response.body.checks).toHaveProperty('database', true)
      expect(response.body).toHaveProperty('environment')
      expect(response.body).toHaveProperty('version')
    })

    it('should include uptime and timestamp', async () => {
      const response = await request(app).get('/health').expect(200)

      expect(response.body.checks).toHaveProperty('uptime')
      expect(response.body.checks).toHaveProperty('timestamp')
      expect(typeof response.body.checks.uptime).toBe('number')
      expect(response.body.checks.uptime).toBeGreaterThan(0)
    })
  })

  describe('GET /ready', () => {
    it('should return 200 when database is accessible', async () => {
      const response = await request(app).get('/ready').expect(200)

      expect(response.body).toHaveProperty('status', 'ready')
      expect(response.body).toHaveProperty('timestamp')
    })

    it('should have timestamp in ISO format', async () => {
      const response = await request(app).get('/ready').expect(200)

      const timestamp = new Date(response.body.timestamp)
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })

  describe('GET /live', () => {
    it('should always return 200', async () => {
      const response = await request(app).get('/live').expect(200)

      expect(response.body).toHaveProperty('status', 'alive')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
    })

    it('should have positive uptime', async () => {
      const response = await request(app).get('/live').expect(200)

      expect(typeof response.body.uptime).toBe('number')
      expect(response.body.uptime).toBeGreaterThan(0)
    })
  })

  describe('GET /metrics', () => {
    it('should return 200 with performance metrics', async () => {
      const response = await request(app).get('/metrics').expect(200)

      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('memory')
      expect(response.body).toHaveProperty('cpu')
      expect(response.body).toHaveProperty('platform')
      expect(response.body).toHaveProperty('nodeVersion')
      expect(response.body).toHaveProperty('environment')
    })

    it('should have memory metrics', async () => {
      const response = await request(app).get('/metrics').expect(200)

      expect(response.body.memory).toHaveProperty('heapUsed')
      expect(response.body.memory).toHaveProperty('heapTotal')
      expect(response.body.memory).toHaveProperty('external')
      expect(response.body.memory).toHaveProperty('rss')
      expect(typeof response.body.memory.heapUsed).toBe('number')
    })
  })
})
