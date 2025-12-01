import "dotenv/config";
import { defineConfig } from "prisma/config";

// Construct DATABASE_URL from existing env vars
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

if (!dbHost || !dbPort || !dbName || !dbUser || !dbPassword) {
  throw new Error("Missing required database environment variables");
}

const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
