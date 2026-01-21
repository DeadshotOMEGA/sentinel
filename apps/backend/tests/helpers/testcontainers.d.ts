import { PrismaClient } from '@sentinel/database';
export declare class TestDatabase {
    private container;
    prisma: PrismaClient | null;
    private pool;
    private originalDatabaseUrl;
    start(): Promise<void>;
    stop(): Promise<void>;
    reset(): Promise<void>;
    seed(): Promise<void>;
    getClient(): PrismaClient;
}
//# sourceMappingURL=testcontainers.d.ts.map