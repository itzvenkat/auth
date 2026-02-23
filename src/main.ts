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
  // Examples: 'https://app1.com,https://app2.com' or '*.mycompany.com'
  const rawOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

  // Always allow the app's own URL (needed for Swagger UI same-origin requests)
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  if (!allowedOrigins.includes(appUrl)) allowedOrigins.push(appUrl);
  // In dev, always allow localhost:3000 regardless of env config
  if (isDev && !allowedOrigins.includes(`http://localhost:${port}`)) {
    allowedOrigins.push(`http://localhost:${port}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header: curl, Postman, other services)
      if (!origin) return callback(null, true);

      // Wildcard — allow all (dev/open APIs only)
      if (allowedOrigins.includes('*')) return callback(null, true);

      // Exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Wildcard subdomain match: '*.mycompany.com' matches 'https://app.mycompany.com'
      const isWildcardMatch = allowedOrigins.some((allowed) => {
        if (!allowed.startsWith('*.')) return false;
        const rootDomain = allowed.slice(2); // e.g. 'mycompany.com'
        return origin.endsWith(`.${rootDomain}`);
      });

      if (isWildcardMatch) return callback(null, true);

      callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24h preflight cache — reduces OPTIONS round-trips
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
