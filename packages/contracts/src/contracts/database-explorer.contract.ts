import { initContract } from '@ts-rest/core'
import {
  TableListResponseSchema,
  TableDataQuerySchema,
  TablePathParamsSchema,
  TableDataResponseSchema,
  ErrorResponseSchema,
} from '../schemas/index.js'

const c = initContract()

/**
 * Database Explorer API contract
 *
 * Read-only endpoints for admin users to explore database tables
 */
export const databaseExplorerContract = c.router({
  /**
   * List all available tables with row counts
   */
  listTables: {
    method: 'GET',
    path: '/api/database/tables',
    responses: {
      200: TableListResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List available database tables',
    description: 'Get a list of all allowed database tables with row counts for admin exploration',
  },

  /**
   * Get paginated data from a specific table
   */
  getTableData: {
    method: 'GET',
    path: '/api/database/:table',
    pathParams: TablePathParamsSchema,
    query: TableDataQuerySchema,
    responses: {
      200: TableDataResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      403: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get table data',
    description: 'Get paginated data from a specific database table with column metadata',
  },
})
