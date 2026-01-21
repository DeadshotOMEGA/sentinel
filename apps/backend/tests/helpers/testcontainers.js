import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@sentinel/database';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import path from 'path';
export class TestDatabase {
    container = null;
    prisma = null;
    pool = null;
    originalDatabaseUrl;
    async start() {
        this.originalDatabaseUrl = process.env.DATABASE_URL;
        console.log('Starting PostgreSQL test container...');
        this.container = await new PostgreSqlContainer('postgres:15-alpine')
            .withDatabase('sentineltest')
            .withUsername('testuser')
            .withPassword('testpass')
            .withReuse()
            .start();
        const connectionString = this.container.getConnectionUri();
        process.env.DATABASE_URL = connectionString;
        this.pool = new Pool({ connectionString });
        const adapter = new PrismaPg(this.pool);
        this.prisma = new PrismaClient({
            adapter,
            log: ['error'],
        });
        console.log('Applying database schema...');
        const schemaPath = path.resolve(__dirname, '../../../../packages/database/prisma/schema.prisma');
        try {
            execSync(`npx prisma db push --schema=${schemaPath} --url="${connectionString}" --accept-data-loss`, {
                stdio: 'pipe',
            });
            console.log('Schema applied successfully');
        }
        catch (error) {
            console.error('Schema application failed:', error);
            throw error;
        }
    }
    async stop() {
        if (this.prisma) {
            await this.prisma.$disconnect();
            this.prisma = null;
        }
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        if (this.container) {
            await this.container.stop();
            this.container = null;
        }
        if (this.originalDatabaseUrl) {
            process.env.DATABASE_URL = this.originalDatabaseUrl;
        }
        else {
            delete process.env.DATABASE_URL;
        }
    }
    async reset() {
        if (!this.prisma) {
            throw new Error('Prisma client not initialized. Call start() first.');
        }
        await this.prisma.$executeRawUnsafe('SET session_replication_role = replica;');
        const tables = await this.prisma.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations';`);
        for (const { tablename } of tables) {
            await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        }
        await this.prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    }
    async seed() {
        if (!this.prisma) {
            throw new Error('Prisma client not initialized. Call start() first.');
        }
        await this.prisma.division.createMany({
            data: [
                { code: 'OPS', name: 'Operations', description: 'Operations Division' },
                { code: 'LOG', name: 'Logistics', description: 'Logistics Division' },
                { code: 'ADMIN', name: 'Administration', description: 'Administration Division' },
            ],
            skipDuplicates: true,
        });
    }
    getClient() {
        if (!this.prisma) {
            throw new Error('Prisma client not initialized. Call start() first.');
        }
        return this.prisma;
    }
}
//# sourceMappingURL=testcontainers.js.map