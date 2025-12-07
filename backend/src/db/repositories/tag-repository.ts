import { prisma } from '../prisma';
import type { Tag as PrismaTag } from '@prisma/client';
import type {
  Tag,
  CreateTagInput,
  UpdateTagInput,
} from '../../../../shared/types';

/**
 * Convert Prisma Tag (null) to shared Tag (undefined)
 */
function toTag(t: PrismaTag): Tag {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    description: t.description ?? undefined,
    createdAt: t.createdAt ?? new Date(),
    updatedAt: t.updatedAt ?? new Date(),
  };
}

export class TagRepository {
  /**
   * Find all tags
   */
  async findAll(): Promise<Tag[]> {
    const tags = await prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return tags.map(toTag);
  }

  /**
   * Find tag by ID
   */
  async findById(id: string): Promise<Tag | null> {
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    return tag ? toTag(tag) : null;
  }

  /**
   * Find tag by name
   */
  async findByName(name: string): Promise<Tag | null> {
    const tag = await prisma.tag.findUnique({
      where: { name },
    });

    return tag ? toTag(tag) : null;
  }

  /**
   * Create a new tag
   */
  async create(data: CreateTagInput): Promise<Tag> {
    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        description: data.description ?? null,
      },
    });

    return toTag(tag);
  }

  /**
   * Update a tag
   */
  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    if (Object.keys(data).length === 0) {
      throw new Error('No fields to update');
    }

    try {
      const tag = await prisma.tag.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.description !== undefined && { description: data.description }),
        },
      });

      return toTag(tag);
    } catch (error) {
      throw new Error(`Tag not found: ${id}`);
    }
  }

  /**
   * Delete a tag
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.tag.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Tag not found: ${id}`);
    }
  }
}

export const tagRepository = new TagRepository();
