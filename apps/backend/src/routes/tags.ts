import { initServer } from '@ts-rest/express'
import { tagContract } from '@sentinel/contracts'
import type { AssignTagInput } from '@sentinel/contracts'
import { TagRepository } from '../repositories/tag-repository.js'
import { MemberRepository } from '../repositories/member-repository.js'
import { getPrismaClient } from '../lib/database.js'

const s = initServer()

const tagRepo = new TagRepository(getPrismaClient())
const memberRepo = new MemberRepository(getPrismaClient())

/**
 * Tags route implementation using ts-rest
 */
export const tagsRouter = s.router(tagContract, {
  /**
   * Get all tags
   */
  getTags: async () => {
    try {
      const tags = await tagRepo.findAll()

      return {
        status: 200 as const,
        body: {
          tags: tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            description: tag.description ?? null,
            chipVariant: tag.chipVariant ?? 'solid',
            chipColor: tag.chipColor ?? 'default',
            isPositional: tag.isPositional,
            createdAt: tag.createdAt.toISOString(),
            updatedAt: tag.updatedAt.toISOString(),
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tags',
        },
      }
    }
  },

  /**
   * Get tags for a specific member
   */
  getMemberTags: async ({ params }: { params: { memberId: string } }) => {
    try {
      // Verify member exists
      const member = await memberRepo.findById(params.memberId)
      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.memberId}' not found`,
          },
        }
      }

      const memberTags = await tagRepo.getMemberTags(params.memberId)

      return {
        status: 200 as const,
        body: {
          data: memberTags.map((mt) => ({
            id: mt.id,
            tagId: mt.tagId,
            memberId: mt.memberId,
            tag: {
              id: mt.tag.id,
              name: mt.tag.name,
              description: mt.tag.description ?? null,
              chipVariant: mt.tag.chipVariant ?? 'solid',
              chipColor: mt.tag.chipColor ?? 'default',
              isPositional: mt.tag.isPositional,
            },
            createdAt: mt.createdAt.toISOString(),
          })),
        },
      }
    } catch (error) {
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch member tags',
        },
      }
    }
  },

  /**
   * Assign a tag to a member
   */
  assignTag: async ({ params, body }: { params: { memberId: string }; body: AssignTagInput }) => {
    try {
      // Verify member exists
      const member = await memberRepo.findById(params.memberId)
      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.memberId}' not found`,
          },
        }
      }

      const memberTag = await tagRepo.assignTagToMember(params.memberId, body.tagId)

      return {
        status: 201 as const,
        body: {
          id: memberTag.id,
          tagId: memberTag.tagId,
          memberId: memberTag.memberId,
          tag: {
            id: memberTag.tag.id,
            name: memberTag.tag.name,
            description: memberTag.tag.description ?? null,
            chipVariant: memberTag.tag.chipVariant ?? 'solid',
            chipColor: memberTag.tag.chipColor ?? 'default',
            isPositional: memberTag.tag.isPositional,
          },
          createdAt: memberTag.createdAt.toISOString(),
        },
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return {
            status: 404 as const,
            body: {
              error: 'NOT_FOUND',
              message: error.message,
            },
          }
        }
        if (error.message.includes('already assigned')) {
          return {
            status: 409 as const,
            body: {
              error: 'CONFLICT',
              message: error.message,
            },
          }
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign tag',
        },
      }
    }
  },

  /**
   * Remove a tag from a member
   */
  removeTag: async ({ params }: { params: { memberId: string; tagId: string } }) => {
    try {
      // Verify member exists
      const member = await memberRepo.findById(params.memberId)
      if (!member) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: `Member with ID '${params.memberId}' not found`,
          },
        }
      }

      await tagRepo.removeTagFromMember(params.memberId, params.tagId)

      return {
        status: 200 as const,
        body: {
          success: true,
          message: 'Tag removed from member successfully',
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not assigned')) {
        return {
          status: 404 as const,
          body: {
            error: 'NOT_FOUND',
            message: error.message,
          },
        }
      }
      return {
        status: 500 as const,
        body: {
          error: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to remove tag',
        },
      }
    }
  },
})
