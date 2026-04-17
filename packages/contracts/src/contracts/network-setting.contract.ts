import { initContract } from '@ts-rest/core'
import {
  ErrorResponseSchema,
  NetworkSettingsResponseSchema,
  SuccessResponseSchema,
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
      description: 'Persist the approved Wi-Fi SSID allowlist for Sentinel hotspot validation.',
    },

    hostHotspotRecovery: {
      method: 'POST',
      path: '/api/network-settings/host-hotspot-recovery',
      body: c.type<undefined>(),
      responses: {
        202: SuccessResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Request host hotspot recovery',
      description:
        'Queue a host-side Sentinel hotspot recovery request for the deployment server laptop.',
    },

    queueLatestSystemUpdate: {
      method: 'POST',
      path: '/api/network-settings/system-update-latest',
      body: c.type<undefined>(),
      responses: {
        202: SuccessResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Queue latest system update',
      description:
        'Queue a host-side Sentinel system update request that upgrades to the latest release.',
    },
  },
  {
    pathPrefix: '',
  }
)
