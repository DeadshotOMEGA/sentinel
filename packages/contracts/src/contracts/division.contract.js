import { initContract } from '@ts-rest/core';
import { CreateDivisionSchema, UpdateDivisionSchema, DivisionResponseSchema, DivisionListQuerySchema, DivisionListResponseSchema, ErrorResponseSchema, IdParamSchema, SuccessResponseSchema, } from '../schemas/index.js';
const c = initContract();
export const divisionContract = c.router({
    getDivisions: {
        method: 'GET',
        path: '/api/divisions',
        query: DivisionListQuerySchema,
        responses: {
            200: DivisionListResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'List all divisions',
        description: 'Get paginated list of divisions with optional search and statistics',
    },
    getDivisionById: {
        method: 'GET',
        path: '/api/divisions/:id',
        pathParams: IdParamSchema,
        responses: {
            200: DivisionResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Get division by ID',
        description: 'Retrieve a single division by its unique ID',
    },
    createDivision: {
        method: 'POST',
        path: '/api/divisions',
        body: CreateDivisionSchema,
        responses: {
            201: DivisionResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            409: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Create new division',
        description: 'Create a new division with the provided information',
    },
    updateDivision: {
        method: 'PATCH',
        path: '/api/divisions/:id',
        pathParams: IdParamSchema,
        body: UpdateDivisionSchema,
        responses: {
            200: DivisionResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            409: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Update division',
        description: 'Update an existing division with the provided information',
    },
    deleteDivision: {
        method: 'DELETE',
        path: '/api/divisions/:id',
        pathParams: IdParamSchema,
        body: c.type(),
        responses: {
            200: SuccessResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            409: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Delete division',
        description: 'Delete a division by its unique ID (only if no members assigned)',
    },
});
//# sourceMappingURL=division.contract.js.map