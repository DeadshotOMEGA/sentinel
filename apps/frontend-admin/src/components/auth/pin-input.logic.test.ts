import { describe, expect, it } from 'vitest'
import type { RemoteSystemOption } from '@sentinel/contracts'
import {
  formatRemoteSystemOptionLabel,
  resolveDefaultRemoteSystemId,
  resolveEffectiveRemoteSystemId,
  resolveForcedRemoteSystem,
} from './pin-input.logic'

const REMOTE_SYSTEMS: RemoteSystemOption[] = [
  {
    id: 'remote-brow',
    code: 'brow_controller',
    name: 'Brow',
    description: 'Brow station',
    displayOrder: 0,
    isOccupied: true,
  },
  {
    id: 'remote-server',
    code: 'deployment_laptop',
    name: 'Server',
    description: 'Server host for the Sentinel hotspot and shared services.',
    displayOrder: 1,
    isOccupied: true,
  },
  {
    id: 'remote-office',
    code: 'ships_office',
    name: "Ship's Office",
    description: 'Office station',
    displayOrder: 2,
    isOccupied: false,
  },
]

describe('pin-input logic', () => {
  it('falls back from a stale or occupied saved selection to the first selectable remote system', () => {
    expect(
      resolveDefaultRemoteSystemId({
        remoteSystems: REMOTE_SYSTEMS,
        initialSelection: { id: 'remote-brow' },
        loginContext: {
          isHostDevice: false,
          forcedRemoteSystemId: null,
        },
      })
    ).toBe('remote-office')
  })

  it('locks host-device logins to the forced server remote system', () => {
    expect(
      resolveEffectiveRemoteSystemId({
        remoteSystems: REMOTE_SYSTEMS,
        selectedRemoteSystem: 'remote-office',
        loginContext: {
          isHostDevice: true,
          forcedRemoteSystemId: 'remote-server',
        },
      })
    ).toBe('remote-server')

    expect(
      resolveForcedRemoteSystem(REMOTE_SYSTEMS, {
        isHostDevice: true,
        forcedRemoteSystemId: 'remote-server',
      })?.name
    ).toBe('Server')
  })

  it('marks occupied systems as in use in the selector label', () => {
    expect(
      formatRemoteSystemOptionLabel(REMOTE_SYSTEMS[0] as RemoteSystemOption, {
        isHostDevice: false,
        forcedRemoteSystemId: null,
      })
    ).toBe('Brow - In use')
  })
})
