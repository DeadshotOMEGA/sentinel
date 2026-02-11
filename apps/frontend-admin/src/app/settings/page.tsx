'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnumTable } from '@/components/settings/enum-table'
import { QualificationTypeTable } from '@/components/settings/qualification-type-table'
import { StatHolidayTable } from '@/components/settings/stat-holiday-table'
import { Users, BadgeCheck, UserCheck, Building, Tag, Award, Calendar } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
        <Tabs defaultValue="member-types" className="space-y-4">
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
