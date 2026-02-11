import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Enable CORS for local development
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // Listen on port 4000
  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`🚀 StockIt API running on http://localhost:${port}/api`);
}
bootstrap();
