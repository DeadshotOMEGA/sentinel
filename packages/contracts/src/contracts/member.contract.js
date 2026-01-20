import { initContract } from '@ts-rest/core';
import { CreateMemberSchema, UpdateMemberSchema, MemberResponseSchema, MemberListQuerySchema, MemberListResponseSchema, ErrorResponseSchema, IdParamSchema, SuccessResponseSchema, } from '../schemas/index.js';
const c = initContract();
export const memberContract = c.router({
    getMembers: {
        method: 'GET',
        path: '/api/members',
        query: MemberListQuerySchema,
        responses: {
            200: MemberListResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'List all members',
        description: 'Get paginated list of members with optional filtering by division, rank, and status',
    },
    getMemberById: {
        method: 'GET',
        path: '/api/members/:id',
        pathParams: IdParamSchema,
        responses: {
            200: MemberResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Get member by ID',
        description: 'Retrieve a single member by their unique ID',
    },
    createMember: {
        method: 'POST',
        path: '/api/members',
        body: CreateMemberSchema,
        responses: {
            201: MemberResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            409: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Create new member',
        description: 'Create a new member with the provided information',
    },
    updateMember: {
        method: 'PATCH',
        path: '/api/members/:id',
        pathParams: IdParamSchema,
        body: UpdateMemberSchema,
        responses: {
            200: MemberResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            409: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Update member',
        description: 'Update an existing member with the provided information',
    },
    deleteMember: {
        method: 'DELETE',
        path: '/api/members/:id',
        pathParams: IdParamSchema,
        body: c.type(),
        responses: {
            200: SuccessResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Delete member',
        description: 'Delete a member by their unique ID',
    },
    searchByServiceNumber: {
        method: 'GET',
        path: '/api/members/search/:serviceNumber',
        pathParams: c.type(),
        responses: {
            200: MemberResponseSchema,
            400: ErrorResponseSchema,
            401: ErrorResponseSchema,
            404: ErrorResponseSchema,
            500: ErrorResponseSchema,
        },
        summary: 'Search member by service number',
        description: 'Find a member by their service number',
    },
});
//# sourceMappingURL=member.contract.js.map