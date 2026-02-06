'use client'

import { useState, useMemo } from 'react'
import { Search, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { useMembers } from '@/hooks/use-members'

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
  const { data: membersData, isLoading } = useMembers({
    status: 'active',
    qualificationCode: filterQualification,
    limit: 100,
    search: search || undefined,
  })

  const filteredMembers = useMemo(() => {
    if (!membersData?.members) return []

    return membersData.members.filter((member) => {
      // Exclude already assigned members
      if (excludeMemberIds.includes(member.id)) return false
      return true
    })
  }, [membersData?.members, excludeMemberIds])

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/60" />
          <Input
            placeholder="Search by name or service number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-base-content/60">
              Loading members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/60 gap-2">
              <User className="h-8 w-8" />
              <p>No eligible members found</p>
            </div>
          ) : (
            <ul className="list bg-base-100 rounded-box">
              {filteredMembers.map((member) => {
                const quals = member.qualifications ?? []
                return (
                  <li
                    key={member.id}
                    className="list-row cursor-pointer hover:bg-base-200/50 transition-colors"
                    onClick={() =>
                      handleSelect({
                        id: member.id,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        rank: member.rank,
                        serviceNumber: member.serviceNumber,
                        qualifications: quals,
                      })
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSelect({
                          id: member.id,
                          firstName: member.firstName,
                          lastName: member.lastName,
                          rank: member.rank,
                          serviceNumber: member.serviceNumber,
                          qualifications: quals,
                        })
                      }
                    }}
                  >
                    <div className="flex items-center justify-center size-10 rounded-box bg-base-300 text-xs font-semibold uppercase">
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.rank} {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs uppercase font-semibold opacity-60">
                        {member.serviceNumber}
                      </div>
                    </div>
                    {quals.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {quals.slice(0, 3).map((qual) => (
                          <Chip key={qual.code} variant="bordered" color="default" size="sm">
                            {qual.code}
                          </Chip>
                        ))}
                        {quals.length > 3 && (
                          <Chip variant="bordered" color="default" size="sm">
                            +{quals.length - 3}
                          </Chip>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
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
