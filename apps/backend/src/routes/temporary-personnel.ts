import { initServer } from '@ts-rest/express'
import { temporaryPersonnelContract } from '@sentinel/contracts'
import type {
  AssignTemporaryPersonnelNfcTagInput,
  CreateTemporaryPersonnelAssignmentInput,
  CreateTemporaryPersonnelInput,
  ManualTemporaryPersonnelCheckinInput,
  ReturnTemporaryPersonnelNfcTagInput,
  TemporaryPersonnelAssignmentIdParam,
  TemporaryPersonnelAssignmentListQuery,
  TemporaryPersonnelIdParam,
  TemporaryPersonnelLifecycleActionInput,
  TemporaryPersonnelNfcAssignmentIdParam,
  TemporaryPersonnelScanInput,
  UpdateTemporaryPersonnelAssignmentInput,
  UpdateTemporaryPersonnelInput,
} from '@sentinel/contracts'
import { getPrismaClient } from '../lib/database.js'
import {
  TemporaryPersonnelRepository,
  TemporaryPersonnelRepositoryError,
} from '../repositories/temporary-personnel-repository.js'
import { PresenceService } from '../services/presence-service.js'

const s = initServer()
const temporaryPersonnelRepo = new TemporaryPersonnelRepository(getPrismaClient())
const presenceService = new PresenceService(getPrismaClient())

function toErrorResponse(error: unknown) {
  if (error instanceof TemporaryPersonnelRepositoryError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
      },
    } as const
  }

  return {
    status: 500 as const,
    body: {
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Temporary personnel operation failed',
    },
  }
}

async function broadcastPresenceSoon(): Promise<void> {
  await presenceService.broadcastStatsUpdate()
}

export const temporaryPersonnelRouter = s.router(temporaryPersonnelContract, {
  getAssignments: async ({ query }: { query: TemporaryPersonnelAssignmentListQuery }) => {
    try {
      const result = await temporaryPersonnelRepo.listAssignments(query)
      return {
        status: 200 as const,
        body: result,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  createAssignment: async ({ body }: { body: CreateTemporaryPersonnelAssignmentInput }) => {
    try {
      const assignment = await temporaryPersonnelRepo.createAssignment(body)
      return {
        status: 201 as const,
        body: assignment,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  getAssignment: async ({ params }: { params: TemporaryPersonnelAssignmentIdParam }) => {
    try {
      const assignment = await temporaryPersonnelRepo.getAssignment(params.id)
      return {
        status: 200 as const,
        body: assignment,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  updateAssignment: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelAssignmentIdParam
    body: UpdateTemporaryPersonnelAssignmentInput
  }) => {
    try {
      const assignment = await temporaryPersonnelRepo.updateAssignment(params.id, body)
      return {
        status: 200 as const,
        body: assignment,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  endAssignment: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelAssignmentIdParam
    body: TemporaryPersonnelLifecycleActionInput
  }) => {
    try {
      const assignment = await temporaryPersonnelRepo.endAssignment(params.id, body.reason)
      await broadcastPresenceSoon()
      return {
        status: 200 as const,
        body: assignment,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  revokeAssignment: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelAssignmentIdParam
    body: TemporaryPersonnelLifecycleActionInput
  }) => {
    try {
      const assignment = await temporaryPersonnelRepo.revokeAssignment(params.id, body.reason)
      await broadcastPresenceSoon()
      return {
        status: 200 as const,
        body: assignment,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  addPersonnel: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelAssignmentIdParam
    body: CreateTemporaryPersonnelInput
  }) => {
    try {
      const person = await temporaryPersonnelRepo.addPersonnel(params.id, body)
      return {
        status: 201 as const,
        body: person,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  updatePersonnel: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelIdParam
    body: UpdateTemporaryPersonnelInput
  }) => {
    try {
      const person = await temporaryPersonnelRepo.updatePersonnel(params.id, body)
      return {
        status: 200 as const,
        body: person,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  endPersonnel: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelIdParam
    body: TemporaryPersonnelLifecycleActionInput
  }) => {
    try {
      const person = await temporaryPersonnelRepo.endPersonnel(params.id, body.reason)
      await broadcastPresenceSoon()
      return {
        status: 200 as const,
        body: person,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  revokePersonnel: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelIdParam
    body: TemporaryPersonnelLifecycleActionInput
  }) => {
    try {
      const person = await temporaryPersonnelRepo.revokePersonnel(params.id, body.reason)
      await broadcastPresenceSoon()
      return {
        status: 200 as const,
        body: person,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  assignNfcTag: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelIdParam
    body: AssignTemporaryPersonnelNfcTagInput
  }) => {
    try {
      const person = await temporaryPersonnelRepo.assignNfcTag(params.id, body.badgeId)
      return {
        status: 201 as const,
        body: person,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  returnNfcTag: async ({
    params,
  }: {
    params: TemporaryPersonnelNfcAssignmentIdParam
    body: ReturnTemporaryPersonnelNfcTagInput
  }) => {
    try {
      await temporaryPersonnelRepo.returnNfcTag(params.id)
      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Temporary personnel NFC tag returned',
        },
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  scan: async ({ body }: { body: TemporaryPersonnelScanInput }) => {
    try {
      const result = await temporaryPersonnelRepo.scan(body)
      await broadcastPresenceSoon()
      return {
        status: 200 as const,
        body: result,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  manualCheckin: async ({
    params,
    body,
  }: {
    params: TemporaryPersonnelIdParam
    body: ManualTemporaryPersonnelCheckinInput
  }) => {
    try {
      const checkin = await temporaryPersonnelRepo.manualCheckin(params.id, body)
      await broadcastPresenceSoon()
      return {
        status: 201 as const,
        body: checkin,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },

  getHistory: async ({ params }: { params: TemporaryPersonnelAssignmentIdParam }) => {
    try {
      const history = await temporaryPersonnelRepo.getHistory(params.id)
      return {
        status: 200 as const,
        body: history,
      }
    } catch (error) {
      return toErrorResponse(error)
    }
  },
})
