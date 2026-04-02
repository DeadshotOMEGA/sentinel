import type { AuthMember, LoginPinSetupReason, PreflightLoginResponse } from '@sentinel/contracts'

export interface SetupFlowState {
  member: AuthMember
  reason: LoginPinSetupReason
}

export function deriveLoginStepFromPreflight(result: PreflightLoginResponse): {
  step: 'pin' | 'setup'
  setupState: SetupFlowState | null
} {
  if (result.pinState === 'setup_required') {
    return {
      step: 'setup',
      setupState: {
        member: result.member,
        reason: result.setupReason ?? 'missing',
      },
    }
  }

  return {
    step: 'pin',
    setupState: null,
  }
}

export function isPinSetupRequiredError(body: unknown): boolean {
  if (!body || typeof body !== 'object' || !('error' in body)) {
    return false
  }

  return body.error === 'PIN_SETUP_REQUIRED'
}

export function getSetupDescription(reason: LoginPinSetupReason): string {
  if (reason === 'default') {
    return 'This badge is still linked to a temporary default PIN. Create a secure PIN before you can continue.'
  }

  return 'This badge does not have a PIN configured yet. Create a secure PIN before you can continue.'
}
