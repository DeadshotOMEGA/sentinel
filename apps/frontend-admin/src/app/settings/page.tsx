'use client'

import { PageShell } from '@/components/layout/page-shell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnumTable } from '@/components/settings/enum-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BadgeCheck, UserCheck, Building, Tag } from 'lucide-react'

export default function SettingsPage() {
  return (
    <PageShell>
      <div className="space-y-6">
        <Tabs defaultValue="member-types" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-[750px]">
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
    </PageShell>
  )
}
