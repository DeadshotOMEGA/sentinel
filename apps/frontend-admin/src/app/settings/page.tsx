'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountLevelSettingsPanel } from '@/components/settings/account-level-settings-panel'
import { DashboardPersonCardSortSettingsPanel } from '@/components/settings/dashboard-person-card-sort-settings-panel'
import { EnumTable } from '@/components/settings/enum-table'
import { EventTypeTable } from '@/components/settings/event-type-table'
import { QualificationTypeTable } from '@/components/settings/qualification-type-table'
import { NetworkSettingsPanel } from '@/components/settings/network-settings-panel'
import { StatHolidayTable } from '@/components/settings/stat-holiday-table'
import { SystemUpdatePanel } from '@/components/settings/system-update-panel'
import { TimingsSettingsPanel } from '@/components/settings/timings-settings-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TID } from '@/lib/test-ids'
import {
  Users,
  BadgeCheck,
  UserCheck,
  Building,
  Shield,
  Tag,
  Award,
  ArrowUpDown,
  Calendar,
  CalendarClock,
  Clock3,
  Download,
  Wifi,
} from 'lucide-react'

const SETTINGS_TAB_VALUES = [
  'member-types',
  'member-statuses',
  'badge-statuses',
  'visit-types',
  'event-types',
  'qualifications',
  'tags',
  'stat-holidays',
  'timings',
  'network',
  'updates',
  'account-levels',
  'dashboard-sorting',
] as const

type SettingsTabValue = (typeof SETTINGS_TAB_VALUES)[number]

function isSettingsTabValue(value: string | null): value is SettingsTabValue {
  return value !== null && SETTINGS_TAB_VALUES.includes(value as SettingsTabValue)
}

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const currentTab: SettingsTabValue = isSettingsTabValue(requestedTab)
    ? requestedTab
    : 'member-types'

  const handleTabChange = (nextTab: string) => {
    if (!isSettingsTabValue(nextTab)) {
      return
    }

    const params = new globalThis.URLSearchParams(searchParams.toString())
    if (nextTab === 'member-types') {
      params.delete('tab')
    } else {
      params.set('tab', nextTab)
    }

    const queryString = params.toString()
    router.replace(queryString ? `/settings?${queryString}` : '/settings', {
      scroll: false,
    })
  }

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
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
          <TabsTrigger
            value="timings"
            className="flex items-center gap-2"
            data-testid={TID.settings.timings.tab}
          >
            <Clock3 className="h-4 w-4" />
            <span className="hidden sm:inline">Timings</span>
          </TabsTrigger>
          <TabsTrigger
            value="network"
            className="flex items-center gap-2"
            data-testid={TID.settings.network.tab}
          >
            <Wifi className="h-4 w-4" />
            <span className="hidden sm:inline">Network</span>
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            className="flex items-center gap-2"
            data-testid={TID.settings.updates.tab}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
          <TabsTrigger value="account-levels" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Account Levels</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard-sorting" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard Sorting</span>
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

        <TabsContent value="timings">
          <TimingsSettingsPanel />
        </TabsContent>

        <TabsContent value="network">
          <NetworkSettingsPanel />
        </TabsContent>

        <TabsContent value="updates">
          <SystemUpdatePanel />
        </TabsContent>

        <TabsContent value="account-levels">
          <AccountLevelSettingsPanel />
        </TabsContent>

        <TabsContent value="dashboard-sorting">
          <DashboardPersonCardSortSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" className="text-base-content/60" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  )
}
