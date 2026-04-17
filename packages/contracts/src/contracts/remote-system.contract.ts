import { initContract } from '@ts-rest/core'
import {
  AdminRemoteSystemsResponseSchema,
  CreateRemoteSystemSchema,
  ErrorResponseSchema,
  IdParamSchema,
  RemoteSystemResponseSchema,
  RemoteSystemsResponseSchema,
  ReorderRemoteSystemsSchema,
  SuccessResponseSchema,
  UpdateRemoteSystemSchema,
} from '../schemas/index.js'

const c = initContract()

export const remoteSystemContract = c.router({
  listRemoteSystems: {
    method: 'GET',
    path: '/api/remote-systems',
    responses: {
      200: RemoteSystemsResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List active remote systems',
    description:
      'Return active remote systems for login, including occupied-state hints and host-device login context.',
  },

  listAdminRemoteSystems: {
    method: 'GET',
    path: '/api/remote-systems/admin',
    responses: {
      200: AdminRemoteSystemsResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List remote systems for administration',
    description:
      'Return all remote systems, including inactive entries and usage statistics, for Settings management.',
  },

  createRemoteSystem: {
    method: 'POST',
    path: '/api/remote-systems',
    body: CreateRemoteSystemSchema,
    responses: {
      201: RemoteSystemResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Create remote system',
    description: 'Create a managed remote system for login selection and activity tracking.',
  },

  reorderRemoteSystems: {
    method: 'PUT',
    path: '/api/remote-systems/reorder',
    body: ReorderRemoteSystemsSchema,
    responses: {
      200: SuccessResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Reorder remote systems',
    description: 'Update remote system display order for login and Settings screens.',
  },

  updateRemoteSystem: {
    method: 'PUT',
    path: '/api/remote-systems/:id',
    pathParams: IdParamSchema,
    body: UpdateRemoteSystemSchema,
    responses: {
      200: RemoteSystemResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Update remote system',
    description: 'Update a remote system and optionally activate or deactivate it.',
  },

  deleteRemoteSystem: {
    method: 'DELETE',
    path: '/api/remote-systems/:id',
    pathParams: IdParamSchema,
    body: c.type<undefined>(),
    responses: {
      200: SuccessResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      409: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Delete remote system',
    description:
      'Delete a remote system that has never been used in session history. Used systems must be deactivated instead.',
  },
})
