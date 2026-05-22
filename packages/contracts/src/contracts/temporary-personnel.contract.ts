import { initContract } from '@ts-rest/core'
import {
  AssignTemporaryPersonnelNfcTagSchema,
  CreateTemporaryPersonnelAssignmentSchema,
  CreateTemporaryPersonnelSchema,
  ErrorResponseSchema,
  ManualTemporaryPersonnelCheckinSchema,
  ReturnTemporaryPersonnelNfcTagSchema,
  SuccessResponseSchema,
  TemporaryPersonnelAssignmentIdParamSchema,
  TemporaryPersonnelAssignmentListQuerySchema,
  TemporaryPersonnelAssignmentListResponseSchema,
  TemporaryPersonnelAssignmentResponseSchema,
  TemporaryPersonnelCheckinResponseSchema,
  TemporaryPersonnelHistoryResponseSchema,
  TemporaryPersonnelIdParamSchema,
  TemporaryPersonnelLifecycleActionSchema,
  TemporaryPersonnelNfcAssignmentIdParamSchema,
  TemporaryPersonnelResponseSchema,
  TemporaryPersonnelScanResponseSchema,
  TemporaryPersonnelScanSchema,
  UpdateTemporaryPersonnelAssignmentSchema,
  UpdateTemporaryPersonnelSchema,
} from '../schemas/index.js'

const c = initContract()

export const temporaryPersonnelContract = c.router({
  getAssignments: {
    method: 'GET',
    path: '/api/temporary-personnel/assignments',
    query: TemporaryPersonnelAssignmentListQuerySchema,
    responses: {
      200: TemporaryPersonnelAssignmentListResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List temporary personnel assignments',
    description: 'List current or historical Temporary Personnel Assignments.',
  },

  createAssignment: {
    method: 'POST',
    path: '/api/temporary-personnel/assignments',
    body: CreateTemporaryPersonnelAssignmentSchema,
    responses: {
      201: TemporaryPersonnelAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create temporary personnel assignment',
    description: 'Create a named assignment for temporary workers who need NFC presence scans.',
  },

  getAssignment: {
    method: 'GET',
    path: '/api/temporary-personnel/assignments/:id',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    responses: {
      200: TemporaryPersonnelAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get temporary personnel assignment',
    description: 'Get a Temporary Personnel Assignment with people and current tag state.',
  },

  updateAssignment: {
    method: 'PATCH',
    path: '/api/temporary-personnel/assignments/:id',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    body: UpdateTemporaryPersonnelAssignmentSchema,
    responses: {
      200: TemporaryPersonnelAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update temporary personnel assignment',
    description: 'Update assignment details or extend an active assignment.',
  },

  endAssignment: {
    method: 'POST',
    path: '/api/temporary-personnel/assignments/:id/end',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    body: TemporaryPersonnelLifecycleActionSchema,
    responses: {
      200: TemporaryPersonnelAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'End temporary personnel assignment',
    description: 'End an assignment, stop access, and administratively check out anyone present.',
  },

  revokeAssignment: {
    method: 'POST',
    path: '/api/temporary-personnel/assignments/:id/revoke',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    body: TemporaryPersonnelLifecycleActionSchema,
    responses: {
      200: TemporaryPersonnelAssignmentResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Revoke temporary personnel assignment',
    description:
      'Revoke an assignment early, stop access, and administratively check out anyone present.',
  },

  addPersonnel: {
    method: 'POST',
    path: '/api/temporary-personnel/assignments/:id/personnel',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    body: CreateTemporaryPersonnelSchema,
    responses: {
      201: TemporaryPersonnelResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Add temporary personnel',
    description: 'Add a temporary worker to an assignment.',
  },

  updatePersonnel: {
    method: 'PATCH',
    path: '/api/temporary-personnel/personnel/:id',
    pathParams: TemporaryPersonnelIdParamSchema,
    body: UpdateTemporaryPersonnelSchema,
    responses: {
      200: TemporaryPersonnelResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update temporary personnel',
    description: 'Update identity details for a temporary worker.',
  },

  endPersonnel: {
    method: 'POST',
    path: '/api/temporary-personnel/personnel/:id/end',
    pathParams: TemporaryPersonnelIdParamSchema,
    body: TemporaryPersonnelLifecycleActionSchema,
    responses: {
      200: TemporaryPersonnelResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'End temporary personnel access',
    description:
      'End a temporary worker access record and administratively check them out if present.',
  },

  revokePersonnel: {
    method: 'POST',
    path: '/api/temporary-personnel/personnel/:id/revoke',
    pathParams: TemporaryPersonnelIdParamSchema,
    body: TemporaryPersonnelLifecycleActionSchema,
    responses: {
      200: TemporaryPersonnelResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Revoke temporary personnel access',
    description:
      'Revoke a temporary worker access record early and administratively check them out if present.',
  },

  assignNfcTag: {
    method: 'POST',
    path: '/api/temporary-personnel/personnel/:id/nfc-assignments',
    pathParams: TemporaryPersonnelIdParamSchema,
    body: AssignTemporaryPersonnelNfcTagSchema,
    responses: {
      201: TemporaryPersonnelResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Assign NFC tag to temporary personnel',
    description: 'Assign an active unassigned NFC tag for presence-only Temporary Personnel scans.',
  },

  returnNfcTag: {
    method: 'POST',
    path: '/api/temporary-personnel/nfc-assignments/:id/return',
    pathParams: TemporaryPersonnelNfcAssignmentIdParamSchema,
    body: ReturnTemporaryPersonnelNfcTagSchema,
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Return temporary personnel NFC tag',
    description: 'Mark a temporary personnel NFC tag physically returned and available for reuse.',
  },

  scan: {
    method: 'POST',
    path: '/api/temporary-personnel/scan',
    body: TemporaryPersonnelScanSchema,
    responses: {
      200: TemporaryPersonnelScanResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Scan temporary personnel NFC tag',
    description: 'Online-only scan flow for Temporary Personnel presence-only NFC tags.',
  },

  manualCheckin: {
    method: 'POST',
    path: '/api/temporary-personnel/personnel/:id/checkins/manual',
    pathParams: TemporaryPersonnelIdParamSchema,
    body: ManualTemporaryPersonnelCheckinSchema,
    responses: {
      201: TemporaryPersonnelCheckinResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Manually check temporary personnel in or out',
    description: 'Create an audited manual Temporary Personnel Check-In correction.',
  },

  getHistory: {
    method: 'GET',
    path: '/api/temporary-personnel/assignments/:id/history',
    pathParams: TemporaryPersonnelAssignmentIdParamSchema,
    responses: {
      200: TemporaryPersonnelHistoryResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get temporary personnel assignment history',
    description: 'Get scan and NFC custody history for a Temporary Personnel Assignment.',
  },
})
