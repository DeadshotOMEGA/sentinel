// Tag-related types

export interface Tag {
  id: string
  name: string
  description?: string
  displayOrder: number
  chipVariant?: string
  chipColor?: string
  isPositional: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateTagInput {
  name: string
  description?: string
  displayOrder?: number
  chipVariant?: string
  chipColor?: string
  isPositional?: boolean
}

export interface UpdateTagInput {
  name?: string
  description?: string
  displayOrder?: number
  chipVariant?: string
  chipColor?: string
  isPositional?: boolean
}
