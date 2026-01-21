export type ApiResponse<T> = {
    data: T;
    error?: never;
} | {
    data?: never;
    error: string;
};
export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
};
export type BadgeStatus = 'active' | 'inactive' | 'lost' | 'damaged';
export type CheckinDirection = 'in' | 'out';
export type UserRole = 'quartermaster' | 'admin' | 'developer';
export * from './member.types';
//# sourceMappingURL=index.d.ts.map