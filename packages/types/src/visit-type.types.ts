// Visit type enumeration types

export interface VisitTypeEnum {
  id: string
  code: string
  name: string
  description?: string
  chipVariant?: string
  chipColor?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateVisitTypeInput {
  code: string
  name: string
  description?: string
  chipVariant?: string
  chipColor?: string
}

export interface UpdateVisitTypeInput {
  code?: string
  name?: string
  description?: string
  chipVariant?: string
  chipColor?: string
}
