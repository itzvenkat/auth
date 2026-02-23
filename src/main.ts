import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RolesService } from './roles/roles.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const port = process.env.PORT || 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS — supports multiple origins via CORS_ORIGINS (comma-separated)
  const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  // Always allow the app's own URL
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  if (!allowedOrigins.includes(appUrl)) allowedOrigins.push(appUrl);

  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow EVERYTHING to unblock testing/Swagger
      if (isDev) return callback(null, true);

      // In production, enforce strict origin checks
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Wildcard subdomain match: '*.mycompany.com'
      const isWildcardMatch = allowedOrigins.some((allowed) => {
        if (!allowed.startsWith('*.')) return false;
        const rootDomain = allowed.slice(2);
        return origin.endsWith(`.${rootDomain}`);
      });

      if (isWildcardMatch) return callback(null, true);

      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Docs (dev only, or can be toggled)
  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('Auth Microservice API')
      .setDescription(
        'Production-grade authentication service with JWT, 2FA, OAuth2, RBAC, and more.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-API-Key' }, 'X-API-Key')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Roles', 'Role management')
      .addTag('Admin', 'Admin endpoints (admin role required)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`📘 Swagger UI: http://localhost:${port}/api`);
  }

  // Seed default roles on startup
  try {
    const rolesService = app.get(RolesService);
    await rolesService.seedDefaultRoles();
  } catch {
    // Non-fatal: DB may not be ready yet
  }

  await app.listen(port);
  console.log(`🚀 Auth Service running at http://localhost:${port}`);
  console.log(`🔑 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
