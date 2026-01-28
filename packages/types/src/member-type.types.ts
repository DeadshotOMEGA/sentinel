// Member type enumeration types

export interface MemberTypeEnum {
  id: string
  code: string
  name: string
  description?: string
  chipVariant?: string
  chipColor?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateMemberTypeInput {
  code: string
  name: string
  description?: string
  chipVariant?: string
  chipColor?: string
}

export interface UpdateMemberTypeInput {
  code?: string
  name?: string
  description?: string
  chipVariant?: string
  chipColor?: string
}
