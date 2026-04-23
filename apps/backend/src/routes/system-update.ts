import { randomUUID } from 'node:crypto'
import { initServer } from '@ts-rest/express'
import type { Request } from 'express'
import { systemUpdateContract } from '@sentinel/contracts'
import { compareVersionTags } from '../lib/service-version.js'
import { hasSystemUpdatePermission, isSystemUpdateJobFinished } from '../lib/system-update-state.js'
import { getRequestClientIp } from '../lib/runtime-context.js'
import {
  SystemUpdateBridgeClient,
  SystemUpdateBridgeClientError,
} from '../services/system-update-bridge-client.js'
import { SystemUpdateStatusService } from '../services/system-update-status-service.js'
import { SystemUpdateTraceService } from '../services/system-update-trace-service.js'

const s = initServer()

function requireMember(req: Request) {
  if (!req.member) {
    return {
      status: 401 as const,
      body: {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }
  }

  return null
}

function requireSystemUpdateAccess(req: Request) {
  const auth = requireMember(req)
  if (auth) {
    return auth
  }

  if (!hasSystemUpdatePermission(req.member?.accountLevel)) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: 'System update access required',
      },
    }
  }

  return null
}

function buildRequesterName(req: Request): string {
  if (!req.member) {
    return 'Unknown member'
  }

  return [req.member.rank, req.member.firstName, req.member.lastName]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
}

export function createSystemUpdateRouter(options?: {
  statusService?: SystemUpdateStatusService
  bridgeClient?: SystemUpdateBridgeClient
  traceService?: SystemUpdateTraceService
}) {
  const statusService = options?.statusService ?? new SystemUpdateStatusService()
  const bridgeClient = options?.bridgeClient ?? new SystemUpdateBridgeClient()
  const traceService = options?.traceService ?? new SystemUpdateTraceService()

  return s.router(systemUpdateContract, {
    getSystemUpdateStatus: async ({ req }) => {
      const auth = requireMember(req)
      if (auth) {
        return auth
      }

      try {
        const status = await statusService.getStatus()
        return {
          status: 200 as const,
          body: status,
        }
      } catch (error) {
        return {
          status: 500 as const,
          body: {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to load system update status',
          },
        }
      }
    },

    startSystemUpdate: async ({ body, req }) => {
      const auth = requireSystemUpdateAccess(req)
      if (auth) {
        return auth
      }

      try {
        const status = await statusService.getStatus()

        if (status.currentJob && !isSystemUpdateJobFinished(status.currentJob)) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: 'A system update is already in progress',
            },
          }
        }

        if (status.currentVersion === null) {
          return {
            status: 500 as const,
            body: {
              error: 'INTERNAL_ERROR',
              message: 'Current Sentinel version is unavailable',
            },
          }
        }

        if (compareVersionTags(body.targetVersion, status.currentVersion) <= 0) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: `Target version ${body.targetVersion} is not newer than the current version ${status.currentVersion}`,
            },
          }
        }

        const result = await bridgeClient.startUpdate({
          jobId: `system-update-${Date.now()}-${randomUUID()}`,
          targetVersion: body.targetVersion,
          requestedByAccountLevel: req.member?.accountLevel ?? 0,
          requestedByMemberId: req.member?.id ?? 'unknown',
          requestedByMemberName: buildRequesterName(req),
          requestedFromIp: getRequestClientIp(req),
        })

        return {
          status: 202 as const,
          body: {
            success: true,
            message: result.message,
            job: result.job,
          },
        }
      } catch (error) {
        if (error instanceof SystemUpdateBridgeClientError) {
          return {
            status:
              error.statusCode === 400 || error.statusCode === 403 || error.statusCode === 409
                ? error.statusCode
                : 500,
            body: {
              error:
                error.statusCode === 400
                  ? 'VALIDATION_ERROR'
                  : error.statusCode === 403
                    ? 'FORBIDDEN'
                    : error.statusCode === 409
                      ? 'CONFLICT'
                      : 'INTERNAL_ERROR',
              message: error.message,
            },
          }
        }

        return {
          status: 500 as const,
          body: {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to start system update',
          },
        }
      }
    },

    getSystemUpdateTrace: async ({ req }) => {
      const auth = requireSystemUpdateAccess(req)
      if (auth) {
        return auth
      }

      try {
        const trace = await traceService.getTrace()
        return {
          status: 200 as const,
          body: trace,
        }
      } catch (error) {
        return {
          status: 500 as const,
          body: {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to load system update trace',
          },
        }
      }
    },

    getSystemUpdateJob: async ({ params, req }) => {
      const auth = requireMember(req)
      if (auth) {
        return auth
      }

      try {
        const job = await statusService.getJob(params.jobId)
        if (!job) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: 'System update job not found',
            },
          }
        }

        return {
          status: 200 as const,
          body: job,
        }
      } catch (error) {
        return {
          status: 500 as const,
          body: {
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to load system update job',
          },
        }
      }
    },
  })
}

export const systemUpdateRouter = createSystemUpdateRouter()
