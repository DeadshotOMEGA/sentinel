'use client'

import { useState, useMemo } from 'react'
import { Search, User, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLockupEligibleMembers } from '@/hooks/use-qualifications'

interface MemberPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (member: SelectedMember) => void
  title?: string
  description?: string
  filterQualification?: string // Optional: filter by specific qualification code
  excludeMemberIds?: string[] // Members already assigned
}

interface SelectedMember {
  id: string
  firstName: string
  lastName: string
  rank: string
  serviceNumber: string
  qualifications: Array<{ code: string; name: string }>
}

export function MemberPickerModal({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Member',
  description = 'Choose a member to assign',
  filterQualification,
  excludeMemberIds = [],
}: MemberPickerModalProps) {
  const [search, setSearch] = useState('')
  const { data: eligibleMembers, isLoading } = useLockupEligibleMembers()

  const filteredMembers = useMemo(() => {
    if (!eligibleMembers?.data) return []

    return eligibleMembers.data.filter((member) => {
      // Exclude already assigned members
      if (excludeMemberIds.includes(member.id)) return false

      // Filter by qualification if specified
      if (filterQualification) {
        const hasQual = member.qualifications.some(
          (q) => q.code === filterQualification
        )
        if (!hasQual) return false
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const fullName = `${member.rank} ${member.firstName} ${member.lastName}`.toLowerCase()
        const serviceNum = member.serviceNumber.toLowerCase()
        if (!fullName.includes(searchLower) && !serviceNum.includes(searchLower)) {
          return false
        }
      }

      return true
    })
  }, [eligibleMembers?.data, excludeMemberIds, filterQualification, search])

  const handleSelect = (member: SelectedMember) => {
    onSelect(member)
    onOpenChange(false)
    setSearch('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or service number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <User className="h-8 w-8" />
              <p>No eligible members found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSelect(member)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium">
                      {member.rank} {member.firstName} {member.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.serviceNumber}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {member.qualifications.slice(0, 3).map((qual) => (
                        <Badge key={qual.code} variant="outline" className="text-xs">
                          {qual.code}
                        </Badge>
                      ))}
                      {member.qualifications.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{member.qualifications.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
