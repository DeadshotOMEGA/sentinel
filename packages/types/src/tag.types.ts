// Tag-related types

export interface Tag {
  id: string
  name: string
  color: string
  description?: string
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateTagInput {
  name: string
  color: string
  description?: string
  displayOrder?: number
}

export interface UpdateTagInput {
  name?: string
  color?: string
  description?: string
  displayOrder?: number
}
