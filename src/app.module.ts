import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import { configValidationSchema } from './config/config.schema';

@Module({
  imports: [
    // Config — loads .env.{NODE_ENV} first (most specific), then .env (shared defaults)
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
      load: [databaseConfig, jwtConfig, mailConfig],
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env',
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        // synchronize: true is fine in dev; NEVER in production — use migrations instead
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        // Migrations (run via `npm run migration:run`, NOT automatically on startup)
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    EmailModule,
    AdminModule,
  ],
})
export class AppModule { }
