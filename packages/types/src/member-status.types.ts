// Member status enumeration types

export interface MemberStatusEnum {
  id: string
  code: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMemberStatusInput {
  code: string
  name: string
  description?: string
  color?: string
}

export interface UpdateMemberStatusInput {
  code?: string
  name?: string
  description?: string
  color?: string
}
