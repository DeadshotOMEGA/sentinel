import { initServer } from '@ts-rest/express'
import type { Request } from 'express'
import { remoteSystemContract, type AdminRemoteSystem } from '@sentinel/contracts'
import { Prisma } from '@sentinel/database'
import { getPrismaClient } from '../lib/database.js'
import { shouldEnforceMainSystemLoginSelection } from '../lib/runtime-context.js'
import { AccountLevel } from '../middleware/roles.js'
import {
  DEPLOYMENT_REMOTE_SYSTEM_CODE,
  RemoteSystemRepository,
} from '../repositories/remote-system-repository.js'

const s = initServer()

function getRemoteSystemRepository(): RemoteSystemRepository {
  return new RemoteSystemRepository(getPrismaClient())
}

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

function requireAdmin(req: Request) {
  const auth = requireMember(req)
  if (auth) {
    return auth
  }

  if ((req.member?.accountLevel ?? 0) < AccountLevel.ADMIN) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: 'Admin access required',
      },
    }
  }

  return null
}

function toAdminRemoteSystem(system: AdminRemoteSystem): AdminRemoteSystem {
  return system
}

export const remoteSystemsRouter = s.router(remoteSystemContract, {
  listRemoteSystems: async ({ req }) => {
    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      const isHostDevice = shouldEnforceMainSystemLoginSelection(req)
      const [systems, forcedRemoteSystem] = await Promise.all([
        remoteSystemRepository.findActiveLoginOptions(),
        isHostDevice
          ? remoteSystemRepository.findByCode(DEPLOYMENT_REMOTE_SYSTEM_CODE)
          : Promise.resolve(null),
      ])

      return {
        status: 200 as const,
        body: {
          systems: systems.map((system) => ({
            id: system.id,
            code: system.code,
            name: system.name,
            description: system.description,
            displayOrder: system.displayOrder,
            isOccupied: system.isOccupied,
          })),
          loginContext: {
            isHostDevice,
            forcedRemoteSystemId:
              forcedRemoteSystem?.isActive === true ? forcedRemoteSystem.id : null,
          },
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load remote systems',
        },
      }
    }
  },

  listAdminRemoteSystems: async ({ req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      const systems = await remoteSystemRepository.findAdminSystems()

      return {
        status: 200 as const,
        body: {
          systems: systems.map((system) =>
            toAdminRemoteSystem({
              id: system.id,
              code: system.code,
              name: system.name,
              description: system.description,
              displayOrder: system.displayOrder,
              isActive: system.isActive,
              usageCount: system.usageCount,
              activeSessionCount: system.activeSessionCount,
              createdAt: system.createdAt.toISOString(),
              updatedAt: system.updatedAt.toISOString(),
            })
          ),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to load remote systems',
        },
      }
    }
  },

  createRemoteSystem: async ({ body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      const system = await remoteSystemRepository.create({
        code: body.code,
        name: body.name,
        description: body.description,
        displayOrder: body.displayOrder,
      })
      const usageCount = await remoteSystemRepository.countUsage(system.id)

      return {
        status: 201 as const,
        body: {
          system: {
            id: system.id,
            code: system.code,
            name: system.name,
            description: system.description,
            displayOrder: system.displayOrder,
            isActive: system.isActive,
            usageCount,
            activeSessionCount: 0,
            createdAt: system.createdAt.toISOString(),
            updatedAt: system.updatedAt.toISOString(),
          },
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: 'A remote system with that code already exists',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create remote system',
        },
      }
    }
  },

  reorderRemoteSystems: async ({ body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      await remoteSystemRepository.reorder(body.remoteSystemIds)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Remote systems reordered successfully',
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: 'One or more remote systems could not be found',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to reorder remote systems',
        },
      }
    }
  },

  updateRemoteSystem: async ({ params, body, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      const system = await remoteSystemRepository.update(params.id, {
        code: body.code,
        name: body.name,
        description: body.description,
        displayOrder: body.displayOrder,
        isActive: body.isActive,
      })
      const [usageCount, systems] = await Promise.all([
        remoteSystemRepository.countUsage(system.id),
        remoteSystemRepository.findAdminSystems(),
      ])
      const activeSessionCount =
        systems.find((item) => item.id === system.id)?.activeSessionCount ?? 0

      return {
        status: 200 as const,
        body: {
          system: {
            id: system.id,
            code: system.code,
            name: system.name,
            description: system.description,
            displayOrder: system.displayOrder,
            isActive: system.isActive,
            usageCount,
            activeSessionCount,
            createdAt: system.createdAt.toISOString(),
            updatedAt: system.updatedAt.toISOString(),
          },
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: 'A remote system with that code already exists',
          },
        }
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: 'Remote system not found',
          },
        }
      }

      if (error instanceof Error && error.message === 'No fields to update') {
        return {
          status: 400 as const,
          body: {
            error: 'VALIDATION_ERROR',
            message: 'No remote system fields were provided',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update remote system',
        },
      }
    }
  },

  deleteRemoteSystem: async ({ params, req }) => {
    const auth = requireAdmin(req)
    if (auth) {
      return auth
    }

    try {
      const remoteSystemRepository = getRemoteSystemRepository()
      const usageCount = await remoteSystemRepository.countUsage(params.id)
      if (usageCount > 0) {
        return {
          status: 409 as const,
          body: {
            error: 'CONFLICT',
            message: 'Used remote systems must be deactivated instead of deleted',
          },
        }
      }

      await remoteSystemRepository.delete(params.id)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Remote system deleted successfully',
        },
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: 'Remote system not found',
          },
        }
      }

      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete remote system',
        },
      }
    }
  },
})
