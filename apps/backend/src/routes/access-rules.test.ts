import { createExpressEndpoints } from '@ts-rest/express'
import { accessRuleContract } from '@sentinel/contracts'
import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { accessRulesRouter } from './access-rules.js'

function createTestApp() {
  const app = express()
  app.use(express.json())
  createExpressEndpoints(accessRuleContract, accessRulesRouter, app, {
    requestValidationErrorHandler: (err, _req, res) => {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: err.body?.issues || err.pathParams?.issues || err.query?.issues || [],
      })
    },
  })
  return app
}

describe('accessRulesRouter', () => {
  it('routes bulk updates without validating bulk as an Access Rule key', async () => {
    const response = await request(createTestApp())
      .patch('/api/access-rules/bulk/update')
      .send({
        reason: 'Routine policy adjustment',
        changes: [
          {
            key: 'dashboard.view',
            configuredMinimumLevel: 2,
            localDescription: null,
          },
        ],
      })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  })
})
