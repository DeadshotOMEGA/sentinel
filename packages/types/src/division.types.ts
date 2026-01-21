// Division-related types

export interface CreateDivisionInput {
  code: string
  name: string
  description?: string
  color?: string
}

export interface UpdateDivisionInput {
  code?: string
  name?: string
  description?: string
  color?: string
}
