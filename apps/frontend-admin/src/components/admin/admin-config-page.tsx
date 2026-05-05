'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Award,
  BadgeCheck,
  Building,
  Calendar,
  CalendarClock,
  Tag,
  UserCheck,
  Users,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnumTable } from '@/components/settings/enum-table'
import { EventTypeTable } from '@/components/settings/event-type-table'
import { QualificationTypeTable } from '@/components/settings/qualification-type-table'
import { StatHolidayTable } from '@/components/settings/stat-holiday-table'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TID } from '@/lib/test-ids'

const CONFIG_TAB_VALUES = [
  'member-types',
  'member-statuses',
  'badge-statuses',
  'visit-types',
  'event-types',
  'qualifications',
  'tags',
  'stat-holidays',
] as const

const PROMOTED_CONFIG_TAB_PATHS = {
  timings: '/admin/timings',
  'account-levels': '/admin/account-levels',
  'dashboard-sorting': '/admin/dashboard-sorting',
} as const

type ConfigTabValue = (typeof CONFIG_TAB_VALUES)[number]

function isConfigTabValue(value: string | null): value is ConfigTabValue {
  return value !== null && CONFIG_TAB_VALUES.includes(value as ConfigTabValue)
}

function AdminConfigPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const currentTab: ConfigTabValue = isConfigTabValue(requestedTab) ? requestedTab : 'member-types'

  useEffect(() => {
    if (!isPromotedConfigTabValue(requestedTab)) {
      return
    }

    const params = new globalThis.URLSearchParams(searchParams.toString())
    params.delete('tab')

    const queryString = params.toString()
    router.replace(
      queryString
        ? `${PROMOTED_CONFIG_TAB_PATHS[requestedTab]}?${queryString}`
        : PROMOTED_CONFIG_TAB_PATHS[requestedTab],
      { scroll: false }
    )
  }, [requestedTab, router, searchParams])

  if (isPromotedConfigTabValue(requestedTab)) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" className="text-base-content/60" />
      </div>
    )
  }

  const handleTabChange = (nextTab: string) => {
    if (!isConfigTabValue(nextTab)) {
      return
    }

    const params = new globalThis.URLSearchParams(searchParams.toString())

    if (nextTab === 'member-types') {
      params.delete('tab')
    } else {
      params.set('tab', nextTab)
    }

    const queryString = params.toString()
    router.replace(queryString ? `/admin/config?${queryString}` : '/admin/config', {
      scroll: false,
    })
  }

  return (
    <div className="space-y-(--space-4)">
      <div>
        <h1 id="admin-page-title" className="font-display text-3xl font-bold">
          Lists & Types
        </h1>
        <p className="mt-(--space-1) max-w-3xl text-sm text-base-content/65">
          Manage the shared lists, categories, and types that shape Sentinel records and workflows.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-(--space-4)">
        <TabsList>
          <TabsTrigger value="member-types" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Member Types</span>
          </TabsTrigger>
          <TabsTrigger value="member-statuses" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Member Statuses</span>
          </TabsTrigger>
          <TabsTrigger value="badge-statuses" className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Badge Statuses</span>
          </TabsTrigger>
          <TabsTrigger value="visit-types" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Visit Types</span>
          </TabsTrigger>
          <TabsTrigger
            value="event-types"
            className="flex items-center gap-2"
            data-testid={TID.settings.eventTypes.tab}
          >
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Event Types</span>
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Qualifications</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Tags</span>
          </TabsTrigger>
          <TabsTrigger value="stat-holidays" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Stat Holidays</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="member-types">
          <EnumTable
            enumType="member-types"
            title="Member Types"
            description="Categories for different member employment classifications"
          />
        </TabsContent>

        <TabsContent value="member-statuses">
          <EnumTable
            enumType="member-statuses"
            title="Member Statuses"
            description="Status indicators for member records"
          />
        </TabsContent>

        <TabsContent value="badge-statuses">
          <EnumTable
            enumType="badge-statuses"
            title="Badge Statuses"
            description="Status indicators for badge records"
          />
        </TabsContent>

        <TabsContent value="visit-types">
          <EnumTable
            enumType="visit-types"
            title="Visit Types"
            description="Categories for visitor classification"
          />
        </TabsContent>

        <TabsContent value="event-types">
          <EventTypeTable
            title="Event Types"
            description="Templates for event category, default duration, and duty-watch defaults"
          />
        </TabsContent>

        <TabsContent value="qualifications">
          <QualificationTypeTable
            title="Qualification Types"
            description="Qualifications that determine member eligibility for duties like lockup"
          />
        </TabsContent>

        <TabsContent value="tags">
          <EnumTable
            enumType="tags"
            title="Tags"
            description="Labels for organizing and filtering members"
          />
        </TabsContent>

        <TabsContent value="stat-holidays">
          <StatHolidayTable
            title="Statutory Holidays"
            description="Holidays that affect DDS handover timing and operational days"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function isPromotedConfigTabValue(
  value: string | null
): value is keyof typeof PROMOTED_CONFIG_TAB_PATHS {
  return value !== null && value in PROMOTED_CONFIG_TAB_PATHS
}

export function AdminConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <AdminConfigPageContent />
    </Suspense>
  )
}
