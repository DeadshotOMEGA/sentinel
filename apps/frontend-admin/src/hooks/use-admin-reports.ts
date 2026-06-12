'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type {
  DailyPresenceReportConfig,
  DailyPresenceReportResponse,
  MonthlyPresenceReportConfig,
  MonthlyPresenceReportResponse,
  OperationalExceptionsReportConfig,
  OperationalExceptionsReportResponse,
  TrainingNightMonthlyReportConfig,
  TrainingNightMonthlyReportResponse,
  VisitorActivityReportConfig,
  VisitorActivityReportResponse,
  WeeklyPresenceReportConfig,
  WeeklyPresenceReportResponse,
} from '@sentinel/contracts'
import { apiClient } from '@/lib/api-client'

export type AdminReportResponse =
  | DailyPresenceReportResponse
  | WeeklyPresenceReportResponse
  | MonthlyPresenceReportResponse
  | TrainingNightMonthlyReportResponse
  | VisitorActivityReportResponse
  | OperationalExceptionsReportResponse

export type RunAdminReportInput =
  | {
      reportType: 'daily_presence'
      body: DailyPresenceReportConfig
    }
  | {
      reportType: 'weekly_presence'
      body: WeeklyPresenceReportConfig
    }
  | {
      reportType: 'monthly_presence'
      body: MonthlyPresenceReportConfig
    }
  | {
      reportType: 'training_night_monthly'
      body: TrainingNightMonthlyReportConfig
    }
  | {
      reportType: 'visitor_activity'
      body: VisitorActivityReportConfig
    }
  | {
      reportType: 'operational_exceptions'
      body: OperationalExceptionsReportConfig
    }

function getApiErrorMessage(body: unknown, fallback: string): string {
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : fallback

  if (
    typeof body === 'object' &&
    body !== null &&
    'issues' in body &&
    Array.isArray((body as { issues?: unknown }).issues)
  ) {
    const issueMessages = (body as { issues: unknown[] }).issues
      .map((issue) => formatValidationIssue(issue))
      .filter((issueMessage): issueMessage is string => Boolean(issueMessage))

    if (issueMessages.length > 0) {
      return `${message}: ${issueMessages.join('; ')}`
    }
  }

  return message
}

function formatValidationIssue(issue: unknown): string | null {
  if (typeof issue !== 'object' || issue === null) {
    return null
  }

  const issueRecord = issue as { input?: unknown; message?: unknown; path?: unknown }
  const message = typeof issueRecord.message === 'string' ? issueRecord.message : null
  if (!message) {
    return null
  }

  if (
    (message === 'Invalid daily presence sort field' ||
      message === 'Invalid attendance report sort field') &&
    issueRecord.input === 'rank'
  ) {
    return 'Rank sorting requires the updated reports API. Restart or rebuild the backend with the latest report contract, or remove Rank from the sort order.'
  }

  const path = formatValidationIssuePath(issueRecord.path)
  return path ? `${path}: ${message}` : message
}

function formatValidationIssuePath(path: unknown): string | null {
  if (!Array.isArray(path)) {
    return null
  }

  const keys = path
    .map((segment) => {
      if (typeof segment !== 'object' || segment === null || !('key' in segment)) {
        return null
      }

      const key = (segment as { key?: unknown }).key
      return typeof key === 'string' || typeof key === 'number' ? String(key) : null
    })
    .filter((key): key is string => key !== null)

  return keys.length > 0 ? keys.join('.') : null
}

export function useAdminReportRunner() {
  return useMutation<AdminReportResponse, Error, RunAdminReportInput>({
    mutationFn: async (input) => {
      switch (input.reportType) {
        case 'daily_presence': {
          const response = await apiClient.reports.generateDailyPresence({ body: input.body })
          if (response.status !== 200) {
            throw new Error(getApiErrorMessage(response.body, 'Failed to run daily report'))
          }
          return response.body
        }
        case 'weekly_presence': {
          const response = await apiClient.reports.generateWeeklyPresence({ body: input.body })
          if (response.status !== 200) {
            throw new Error(getApiErrorMessage(response.body, 'Failed to run weekly report'))
          }
          return response.body
        }
        case 'monthly_presence': {
          const response = await apiClient.reports.generateMonthlyPresence({ body: input.body })
          if (response.status !== 200) {
            throw new Error(getApiErrorMessage(response.body, 'Failed to run monthly report'))
          }
          return response.body
        }
        case 'training_night_monthly': {
          const response = await apiClient.reports.generateTrainingNightMonthly({
            body: input.body,
          })
          if (response.status !== 200) {
            throw new Error(
              getApiErrorMessage(response.body, 'Failed to run training night report')
            )
          }
          return response.body
        }
        case 'visitor_activity': {
          const response = await apiClient.reports.generateVisitorActivity({ body: input.body })
          if (response.status !== 200) {
            throw new Error(getApiErrorMessage(response.body, 'Failed to run visitor report'))
          }
          return response.body
        }
        case 'operational_exceptions': {
          const response = await apiClient.reports.generateOperationalExceptions({
            body: input.body,
          })
          if (response.status !== 200) {
            throw new Error(
              getApiErrorMessage(response.body, 'Failed to run operational exceptions report')
            )
          }
          return response.body
        }
      }
    },
  })
}

export function useVisitTypesForReports() {
  return useQuery({
    queryKey: ['reports', 'visit-types'],
    queryFn: async () => {
      const response = await apiClient.enums.visitTypes.getVisitTypes()
      if (response.status !== 200) {
        throw new Error('Failed to fetch visit types')
      }
      return response.body.visitTypes
    },
    staleTime: 10 * 60 * 1000,
  })
}
