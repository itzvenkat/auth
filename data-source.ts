/**
 * Standalone TypeORM DataSource — used exclusively by the TypeORM CLI
 * for generating and running migrations outside of the NestJS DI container.
 *
 * Usage:
 *   npm run migration:generate -- src/migrations/CreateUsers
 *   npm run migration:run
 *   npm run migration:revert
 *
 * Note: This file reads from .env (+ .env.{NODE_ENV}) directly via dotenv.
 *       It is NOT used at runtime — NestJS uses app.module.ts for that.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env files in the same priority order as the NestJS app
const nodeEnv = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'authuser',
    password: process.env.DB_PASSWORD || 'authpass',
    database: process.env.DB_DATABASE || 'authdb',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

    // Entities: TypeScript source in dev, compiled JS in prod
    entities: [path.join(__dirname, 'src/**/*.entity{.ts,.js}')],

    // Migrations
    migrations: [path.join(__dirname, 'src/migrations/**/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',

    // NEVER enable synchronize here — this file drives schema via migrations
    synchronize: false,

    logging: nodeEnv === 'development',
});
