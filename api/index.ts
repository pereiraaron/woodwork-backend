import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';

const server = express();
let isReady = false;

async function bootstrap() {
  if (isReady) return;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
  });

  app.use(helmet());
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Woodwork API')
    .setDescription('Furniture e-commerce backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  server.get('/api/docs/swagger.json', (_req: Request, res: Response) => {
    res.json(document);
  });

  server.get('/api/docs', (_req: Request, res: Response) => {
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html><head>
<title>Woodwork API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:"/api/docs/swagger.json",dom_id:"#swagger-ui"})</script>
</body></html>`);
  });

  await app.init();
  isReady = true;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
