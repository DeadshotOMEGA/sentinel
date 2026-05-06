'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type {
  DailyPresenceReportConfig,
  DailyPresenceReportResponse,
  MonthlyPresenceReportConfig,
  MonthlyPresenceReportResponse,
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

function getApiErrorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof (body as { message?: unknown }).message === 'string'
  ) {
    return (body as { message: string }).message
  }

  return fallback
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
