import { BaseRepository, toCamelCase } from './base-repository';
import type {
  Division,
  CreateDivisionInput,
  UpdateDivisionInput,
} from '../../../../shared/types';

export class DivisionRepository extends BaseRepository {
  /**
   * Find all divisions
   */
  async findAll(): Promise<Division[]> {
    const query = `
      SELECT *
      FROM divisions
      ORDER BY code
    `;

    const rows = await this.queryAll<Record<string, unknown>>(query);
    return rows.map((row) => toCamelCase<Division>(row));
  }

  /**
   * Find division by ID
   */
  async findById(id: string): Promise<Division | null> {
    const query = `
      SELECT *
      FROM divisions
      WHERE id = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [id]);
    if (!row) {
      return null;
    }

    return toCamelCase<Division>(row);
  }

  /**
   * Find division by code
   */
  async findByCode(code: string): Promise<Division | null> {
    const query = `
      SELECT *
      FROM divisions
      WHERE code = $1
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [code]);
    if (!row) {
      return null;
    }

    return toCamelCase<Division>(row);
  }

  /**
   * Create a new division
   */
  async create(data: CreateDivisionInput): Promise<Division> {
    const query = `
      INSERT INTO divisions (
        name, code, description
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, [
      data.name,
      data.code,
      data.description !== undefined ? data.description : null,
    ]);

    if (!row) {
      throw new Error('Failed to create division');
    }

    return toCamelCase<Division>(row);
  }

  /**
   * Update a division
   */
  async update(id: string, data: UpdateDivisionInput): Promise<Division> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      params.push(data.code);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE divisions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await this.queryOne<Record<string, unknown>>(query, params);
    if (!row) {
      throw new Error(`Division not found: ${id}`);
    }

    return toCamelCase<Division>(row);
  }

  /**
   * Delete a division (only if no members assigned)
   */
  async delete(id: string): Promise<void> {
    // Check if any members are assigned to this division
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM members
      WHERE division_id = $1
    `;

    const checkRow = await this.queryOne<{ count: string }>(checkQuery, [id]);
    if (!checkRow) {
      throw new Error('Failed to check member count');
    }

    const memberCount = parseInt(checkRow.count);
    if (memberCount > 0) {
      throw new Error(`Cannot delete division with ${memberCount} assigned members`);
    }

    const query = `
      DELETE FROM divisions
      WHERE id = $1
    `;

    const result = await this.query(query, [id]);
    if (result.rowCount === 0) {
      throw new Error(`Division not found: ${id}`);
    }
  }
}

export const divisionRepository = new DivisionRepository();
