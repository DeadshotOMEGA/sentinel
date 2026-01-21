// Member type enumeration types

export interface MemberTypeEnum {
  id: string
  code: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMemberTypeInput {
  code: string
  name: string
  description?: string
  color?: string
}

export interface UpdateMemberTypeInput {
  code?: string
  name?: string
  description?: string
  color?: string
}
