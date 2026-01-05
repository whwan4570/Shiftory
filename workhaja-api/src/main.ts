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
  
  // Railway domain pattern for production
  const railwayDomainPattern = /^https:\/\/.*\.up\.railway\.app$/;
  
  // Log CORS configuration for debugging
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
      
      // Check if origin matches FRONTEND_URL
      if (frontendUrl && origin === frontendUrl) {
        console.log(`[CORS] Origin matches FRONTEND_URL: ${origin}`);
        callback(null, true);
        return;
      }
      
      // In production, also allow Railway frontend domains
      if (process.env.NODE_ENV === 'production') {
        if (railwayDomainPattern.test(origin)) {
          console.log(`[CORS] Origin matches Railway domain pattern: ${origin}`);
          callback(null, true);
          return;
        }
      } else {
        // In development, allow localhost
        if (origin === 'http://localhost:3001' || origin === 'http://localhost:3000') {
          console.log(`[CORS] Origin matches localhost: ${origin}`);
          callback(null, true);
          return;
        }
        // In development, allow all origins
        console.log(`[CORS] Development mode - allowing origin: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Origin not allowed
      console.error(`[CORS] Origin not allowed: ${origin}`);
      callback(new Error(`Not allowed by CORS. Allowed: ${frontendUrl} or Railway domains`));
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
