import { accessRuleService } from '../services/access-rule-service.js'

interface AccessRuleRequest {
  member?: {
    accountLevel?: number | null
  }
}

export async function requireAccessRule(req: AccessRuleRequest, accessRuleKey: string) {
  if (!req.member) {
    return {
      status: 401 as const,
      body: {
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }
  }

  if (!(await accessRuleService.hasAccess(req.member.accountLevel, accessRuleKey))) {
    return {
      status: 403 as const,
      body: {
        error: 'FORBIDDEN',
        message: `Access Rule '${accessRuleKey}' required`,
      },
    }
  }

  return null
}

export async function hasAccessRule(
  req: AccessRuleRequest,
  accessRuleKey: string
): Promise<boolean> {
  if (!req.member) {
    return false
  }

  return accessRuleService.hasAccess(req.member.accountLevel, accessRuleKey)
}
