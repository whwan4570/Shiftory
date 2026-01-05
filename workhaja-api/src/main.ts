import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow cross-origin embedding if needed
  }));

  // Use cookie-parser middleware
  app.use(cookieParser());

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Enable CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  
  // Build allowed origins list (can contain strings or RegExp patterns)
  const allowedOrigins: (string | RegExp)[] = [];
  
  // Add FRONTEND_URL if provided
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
  }
  
  // In production, also allow Railway frontend domains (for dynamic URLs)
  if (process.env.NODE_ENV === 'production') {
    // Allow any Railway app domain (for flexibility)
    // This is safe because we still validate membership in the backend
    allowedOrigins.push(/^https:\/\/.*\.up\.railway\.app$/);
  } else {
    // Development: allow localhost
    allowedOrigins.push('http://localhost:3001', 'http://localhost:3000');
  }
  
  // Log allowed origins for debugging
  console.log(`[CORS] Allowed origins: ${allowedOrigins.map(o => typeof o === 'string' ? o : o.toString()).join(', ')}`);
  console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[CORS] FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        console.log('[CORS] Request with no origin - allowing');
        return callback(null, true);
      }
      
      console.log(`[CORS] Request from origin: ${origin}`);
      
      // Check if origin matches any allowed origin (string or regex)
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        } else if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        console.log(`[CORS] Origin allowed: ${origin}`);
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        // In development, allow all origins
        console.log(`[CORS] Development mode - allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.error(`[CORS] Origin not allowed: ${origin}`);
        const allowedList = allowedOrigins.map(o => typeof o === 'string' ? o : o.toString()).join(', ');
        callback(new Error(`Not allowed by CORS. Allowed origins: ${allowedList}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Workhaja API is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
