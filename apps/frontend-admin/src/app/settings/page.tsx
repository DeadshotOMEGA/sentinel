'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnumTable } from '@/components/settings/enum-table'
import { QualificationTypeTable } from '@/components/settings/qualification-type-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BadgeCheck, UserCheck, Building, Tag, Award } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
        <Tabs defaultValue="member-types" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
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
          </TabsList>

          <TabsContent value="member-types">
            <Card>
              <CardContent>
                <EnumTable
                  enumType="member-types"
                  title="Member Types"
                  description="Categories for different member employment classifications"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="member-statuses">
            <Card>
              <CardContent>
                <EnumTable
                  enumType="member-statuses"
                  title="Member Statuses"
                  description="Status indicators for member records"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="badge-statuses">
            <Card>
              <CardContent>
                <EnumTable
                  enumType="badge-statuses"
                  title="Badge Statuses"
                  description="Status indicators for badge records"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visit-types">
            <Card>
              <CardContent>
                <EnumTable
                  enumType="visit-types"
                  title="Visit Types"
                  description="Categories for visitor classification"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications">
            <Card>
              <CardContent>
                <QualificationTypeTable
                  title="Qualification Types"
                  description="Qualifications that determine member eligibility for duties like lockup"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card>
              <CardContent>
                <EnumTable
                  enumType="tags"
                  title="Tags"
                  description="Labels for organizing and filtering members"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
