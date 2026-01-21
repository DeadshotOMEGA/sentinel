// Visit type enumeration types

export interface VisitTypeEnum {
  id: string
  code: string
  name: string
  description?: string
  color?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateVisitTypeInput {
  code: string
  name: string
  description?: string
  color?: string
}

export interface UpdateVisitTypeInput {
  code?: string
  name?: string
  description?: string
  color?: string
}
