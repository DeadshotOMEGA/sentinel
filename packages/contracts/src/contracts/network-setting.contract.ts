import { initContract } from '@ts-rest/core'
import {
  ErrorResponseSchema,
  NetworkSettingsResponseSchema,
  UpdateNetworkSettingsSchema,
} from '../schemas/index.js'

const c = initContract()

export const networkSettingContract = c.router(
  {
    getNetworkSettings: {
      method: 'GET',
      path: '/api/network-settings',
      responses: {
        200: NetworkSettingsResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get network settings',
      description: 'Get the approved Wi-Fi SSID allowlist used by host-network system status.',
    },

    updateNetworkSettings: {
      method: 'PUT',
      path: '/api/network-settings',
      body: UpdateNetworkSettingsSchema,
      responses: {
        200: NetworkSettingsResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Update network settings',
      description: 'Persist the approved Wi-Fi SSID allowlist for deployment-network validation.',
    },
  },
  {
    pathPrefix: '',
  }
)
